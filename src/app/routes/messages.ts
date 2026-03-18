import type { RouteConfig } from "../../server/router.js";

export const messageRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/messages",
    auth: "public",
    handler: async (ctx) => {
      const result = await ctx.db.query(
        "SELECT * FROM messages ORDER BY created_at DESC LIMIT 50"
      );
      return { status: 200, json: result.rows };
    },
  },
  {
    method: "POST",
    path: "/messages",
    auth: [{ strategy: "cookie" }, { strategy: "jwt" }],
    rateLimit: { windowMs: 60_000, max: 20 },
    handler: async (ctx) => {
      const text = ctx.body.text as string | undefined;
      if (!text || text.trim().length === 0) {
        return { status: 400, json: { error: "text is required" } };
      }

      const result = await ctx.db.query(
        "INSERT INTO messages (author, text) VALUES ($1, $2) RETURNING *",
        [ctx.auth.userId, text.trim()]
      );

      ctx.changes.notify("messages");

      return { status: 201, json: result.rows[0] };
    },
  },
];
