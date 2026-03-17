import type { AuthStrategy, AuthContext } from "../types.js";
import type { SessionStore } from "../session.js";

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key) cookies[key] = rest.join("=");
  }
  return cookies;
}

export function createCookieStrategy(
  sessionStore: SessionStore
): AuthStrategy {
  return {
    name: "cookie",
    async authenticate(req): Promise<AuthContext | null> {
      const cookieHeader = req.headers.cookie;
      if (!cookieHeader) return null;

      const cookies = parseCookies(cookieHeader);
      const sessionId = cookies["session"];
      if (!sessionId) return null;

      const session = await sessionStore.get(sessionId);
      if (!session) return null;

      return {
        userId: session.userId,
        strategy: "cookie",
        sessionId: session.id,
      };
    },
  };
}
