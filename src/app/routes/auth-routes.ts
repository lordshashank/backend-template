import type { RouteConfig } from "../../server/router.js";
import type { SessionStore } from "../../auth/session.js";

export function createAuthRoutes(
  sessionStore: SessionStore,
  options?: { jwtSecret?: string }
): RouteConfig[] {
  const meAuth = options?.jwtSecret
    ? [{ strategy: "cookie" }, { strategy: "jwt" }]
    : [{ strategy: "cookie" }];

  const routes: RouteConfig[] = [
    {
      method: "POST",
      path: "/auth/login",
      auth: "public",
      handler: async (ctx) => {
        const username = ctx.body.username as string | undefined;
        if (!username || username.trim().length === 0) {
          return { status: 400, json: { error: "username is required" } };
        }

        const session = await sessionStore.create(username.trim(), "cookie");

        return {
          status: 200,
          json: { userId: username.trim(), sessionId: session.id },
          headers: {
            "Set-Cookie": `session=${session.id}; Path=/; HttpOnly; SameSite=Lax`,
          },
        };
      },
    },
    {
      method: "POST",
      path: "/auth/logout",
      auth: { strategy: "cookie" },
      handler: async (ctx) => {
        if (ctx.auth.sessionId) {
          await sessionStore.delete(ctx.auth.sessionId);
        }

        return {
          status: 200,
          json: { ok: true },
          headers: {
            "Set-Cookie": "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
          },
        };
      },
    },
    {
      method: "GET",
      path: "/auth/me",
      auth: meAuth,
      handler: async (ctx) => {
        return {
          status: 200,
          json: { userId: ctx.auth.userId, strategy: ctx.auth.strategy },
        };
      },
    },
  ];

  // JWT login (only when JWT_SECRET is set)
  if (options?.jwtSecret) {
    routes.push({
      method: "POST",
      path: "/auth/jwt/login",
      auth: "public",
      handler: async (ctx) => {
        const username = ctx.body.username as string | undefined;
        if (!username || username.trim().length === 0) {
          return { status: 400, json: { error: "username is required" } };
        }

        const { signJwt } = await import("../../auth/strategies/jwt.js");
        const token = signJwt(
          { userId: username.trim() },
          options.jwtSecret!
        );

        return {
          status: 200,
          json: { userId: username.trim(), token },
        };
      },
    });
  }

  return routes;
}
