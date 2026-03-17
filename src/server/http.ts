import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Router, RouteConfig } from "./router.js";
import type { DbAdapter } from "../db/pool.js";
import type { ChangeNotifier } from "../db/changes.js";
import type { AuthMiddleware } from "../auth/middleware.js";
import type { RateLimiter } from "../rate-limit/limiter.js";

export interface HttpServerOptions {
  port: number;
  router: Router;
  db: DbAdapter;
  changes: ChangeNotifier;
  auth: AuthMiddleware;
  rateLimiter: RateLimiter;
  corsOrigin?: string;
}

function sendJson(
  res: ServerResponse,
  status: number,
  data: unknown,
  extraHeaders?: Record<string, string>
) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    if (req.method === "GET" || req.method === "DELETE") {
      resolve({});
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

export function createHttpServer(options: HttpServerOptions): http.Server {
  const { port, router, db, changes, auth, rateLimiter, corsOrigin } = options;

  const server = http.createServer(async (req, res) => {
    // CORS
    if (corsOrigin) {
      res.setHeader("Access-Control-Allow-Origin", corsOrigin);
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ?? "/";
    const method = req.method ?? "GET";

    // Match route
    const matched = router.match(method, url);
    if (!matched) {
      sendJson(res, 404, { error: "Not Found" });
      return;
    }

    const { route, params } = matched;

    try {
      // Rate limit
      const ip = getClientIp(req);
      const limitConfig = route.rateLimit ?? {
        windowMs: 60_000,
        max: 100,
      };
      const limitResult = rateLimiter.check(`${ip}:${route.path}`, limitConfig);

      res.setHeader("X-RateLimit-Limit", limitConfig.max);
      res.setHeader("X-RateLimit-Remaining", limitResult.remaining);

      if (!limitResult.allowed) {
        res.setHeader("Retry-After", Math.ceil(limitResult.retryAfter / 1000));
        sendJson(res, 429, { error: "Too Many Requests" });
        return;
      }

      // Parse body
      let body: Record<string, unknown>;
      try {
        body = await parseBody(req);
      } catch {
        sendJson(res, 400, { error: "Invalid JSON body" });
        return;
      }

      // Validate
      if (route.validate && !route.validate(body)) {
        sendJson(res, 400, { error: "Validation failed" });
        return;
      }

      // Authenticate
      // null = public (no auth needed), false = auth failed, AuthContext = success
      const authResult = await auth.authenticate(req, body, route.auth);
      if (authResult === false) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      // Run handler
      const result = await route.handler({
        req,
        params,
        body,
        db,
        auth: authResult ?? { userId: "", strategy: "public" },
        changes,
      });

      sendJson(res, result.status, result.json, result.headers);
    } catch (err) {
      console.error(`[http] Error handling ${method} ${url}:`, err);
      sendJson(res, 500, { error: "Internal Server Error" });
    }
  });

  server.listen(port, () => {
    console.log(`[http] Server listening on port ${port}`);
  });

  return server;
}
