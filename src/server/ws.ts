import { WebSocketServer, WebSocket } from "ws";
import type { ChangeNotifier } from "../db/changes.js";

export interface WsServerOptions {
  port: number;
  changes: ChangeNotifier;
}

export function createWsServer(options: WsServerOptions): WebSocketServer {
  const { port, changes } = options;
  const wss = new WebSocketServer({ port });

  // Track subscriptions per client
  const clientSubs = new Map<WebSocket, Map<string, () => void>>();

  wss.on("connection", (ws) => {
    const subs = new Map<string, () => void>();
    clientSubs.set(ws, subs);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          subscribe?: string;
          unsubscribe?: string;
        };

        if (msg.subscribe && !subs.has(msg.subscribe)) {
          const resource = msg.subscribe;
          const unsub = changes.onChange(resource, (...scope) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ invalidate: [resource, ...scope] }));
            }
          });
          subs.set(resource, unsub);
        }

        if (msg.unsubscribe && subs.has(msg.unsubscribe)) {
          subs.get(msg.unsubscribe)!();
          subs.delete(msg.unsubscribe);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      for (const unsub of subs.values()) unsub();
      clientSubs.delete(ws);
    });
  });

  // Heartbeat to detect dead connections
  const pingInterval = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }
  }, 30_000);
  pingInterval.unref();

  wss.on("close", () => clearInterval(pingInterval));

  console.log(`[ws] WebSocket server listening on port ${port}`);
  return wss;
}
