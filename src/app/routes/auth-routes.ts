import type { RouteConfig } from "../../server/router.js";
import type { SessionStore } from "../../auth/session.js";

export function createAuthRoutes(sessionStore: SessionStore): RouteConfig[] {
  return [
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
      auth: { strategy: "cookie" },
      handler: async (ctx) => {
        return {
          status: 200,
          json: { userId: ctx.auth.userId, strategy: ctx.auth.strategy },
        };
      },
    },
  ];
}
