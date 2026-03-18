import jwt from "jsonwebtoken";
import type { AuthStrategy, AuthContext } from "../types.js";

export interface JwtPayload {
  userId: string;
  [key: string]: unknown;
}

export function createJwtStrategy(secret: string): AuthStrategy {
  return {
    name: "jwt",
    async authenticate(req): Promise<AuthContext | null> {
      const header = req.headers.authorization;
      if (!header) return null;

      const [scheme, token] = header.split(" ", 2);
      if (scheme !== "Bearer" || !token) return null;

      try {
        const payload = jwt.verify(token, secret) as JwtPayload;
        if (!payload.userId) return null;

        return {
          userId: payload.userId,
          strategy: "jwt",
        };
      } catch {
        return null;
      }
    },
  };
}

/** Helper to sign tokens — use in your login route */
export function signJwt(
  payload: JwtPayload,
  secret: string,
  expiresIn: string | number = "7d"
): string {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] });
}
