import { SiweMessage } from "siwe";
import type { AuthStrategy, AuthContext } from "../types.js";
import type { SessionStore } from "../session.js";

export function createSiweStrategy(sessionStore: SessionStore): AuthStrategy {
  return {
    name: "siwe",
    async authenticate(req, body): Promise<AuthContext | null> {
      const message = body.message as string | undefined;
      const signature = body.signature as string | undefined;
      if (!message || !signature) return null;

      try {
        const siweMessage = new SiweMessage(message);
        const result = await siweMessage.verify({ signature });

        if (!result.success) return null;

        const session = await sessionStore.create(
          result.data.address,
          "siwe",
          { chainId: result.data.chainId }
        );

        return {
          userId: result.data.address,
          strategy: "siwe",
          sessionId: session.id,
          address: result.data.address,
          chainId: result.data.chainId,
        };
      } catch {
        return null;
      }
    },
  };
}
