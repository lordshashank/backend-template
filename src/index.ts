import { loadConfig } from "./config.js";
import { createPostgresAdapter } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";
import { createAuthMiddleware } from "./auth/middleware.js";
import { createSessionStore } from "./auth/session.js";
import { createCookieStrategy } from "./auth/strategies/cookie.js";
import { createRateLimiter } from "./rate-limit/limiter.js";
import {
  createNoopChangeNotifier,
  createPostgresChangeNotifier,
} from "./db/changes.js";
import { createNoopStorage } from "./storage/noop.js";
import { createRouter } from "./server/router.js";
import { createHttpServer } from "./server/http.js";
import { healthRoute } from "./app/routes/health.js";
import { messageRoutes } from "./app/routes/messages.js";
import { createAuthRoutes } from "./app/routes/auth-routes.js";

async function main() {
  const config = loadConfig();

  // Database
  const db = createPostgresAdapter(config.databaseUrl);
  await runMigrations(db, "./migrations");

  // Auth
  const sessionStore = createSessionStore(db);
  const auth = createAuthMiddleware();
  auth.registerStrategy(createCookieStrategy(sessionStore));

  // JWT auth (set JWT_SECRET to activate)
  if (config.jwtSecret) {
    const { createJwtStrategy } = await import("./auth/strategies/jwt.js");
    auth.registerStrategy(createJwtStrategy(config.jwtSecret));
  }

  // Rate limiting
  const rateLimiter = createRateLimiter();

  // Change notifier (set ENABLE_REALTIME=true to activate)
  const changes =
    process.env.ENABLE_REALTIME === "true"
      ? await createPostgresChangeNotifier(config.databaseUrl)
      : createNoopChangeNotifier();

  // Storage (set ENABLE_STORAGE=true to activate)
  let storage;
  if (process.env.ENABLE_STORAGE === "true") {
    const { createS3Storage } = await import("./storage/s3.js");
    storage = createS3Storage({
      s3Bucket: config.s3Bucket!,
      s3Region: config.s3Region!,
      s3Endpoint: config.s3Endpoint,
      s3AccessKeyId: config.s3AccessKeyId!,
      s3SecretAccessKey: config.s3SecretAccessKey!,
    });
  } else {
    storage = createNoopStorage();
  }

  // Router
  const router = createRouter();
  router.addRoute(healthRoute);
  for (const route of messageRoutes) router.addRoute(route);
  for (const route of createAuthRoutes(sessionStore, { jwtSecret: config.jwtSecret })) router.addRoute(route);

  // Errorping routes (set ENABLE_ERRORPING=true to activate)
  if (process.env.ENABLE_ERRORPING === "true") {
    const { createBearerStrategy } = await import("./auth/strategies/bearer.js");
    if (config.errorpingApiKey) {
      auth.registerStrategy(createBearerStrategy(config.errorpingApiKey));
    }

    const { createErrorpingRoutes } = await import("./app/routes/errorping.js");
    for (const route of createErrorpingRoutes({
      botToken: config.errorpingBotToken!,
      chatId: config.errorpingChatId!,
    })) router.addRoute(route);
  }

  // Upload routes (set ENABLE_STORAGE=true to activate)
  if (process.env.ENABLE_STORAGE === "true") {
    const { createUploadRoutes } = await import("./app/routes/uploads.js");
    for (const route of createUploadRoutes({
      auth: { strategy: "jwt" },
      maxSizeBytes: config.uploadMaxSize,
    })) router.addRoute(route);
  }

  // Feedback routes (set ENABLE_FEEDBACK=true to activate)
  if (process.env.ENABLE_FEEDBACK === "true") {
    const { createBearerStrategy } = await import("./auth/strategies/bearer.js");
    if (config.feedbackAdminKey) {
      auth.registerStrategy(createBearerStrategy(config.feedbackAdminKey));
    }

    const { createFeedbackRoutes } = await import("./app/routes/feedback.js");
    for (const route of createFeedbackRoutes({
      userAuth: { strategy: "cookie" },
    })) router.addRoute(route);
  }

  // HTTP server
  const server = createHttpServer({
    port: config.port,
    router,
    db,
    changes,
    auth,
    rateLimiter,
    storage,
    corsOrigin: process.env.CORS_ORIGIN,
  });

  // WebSocket server (only if real-time is enabled, requires `ws` package)
  if (process.env.ENABLE_REALTIME === "true") {
    const { createWsServer } = await import("./server/ws.js");
    createWsServer({ port: config.wsPort, changes });
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[app] Shutting down...");
    server.close();
    await changes.close();
    await db.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[app] Fatal error:", err);
  process.exit(1);
});
