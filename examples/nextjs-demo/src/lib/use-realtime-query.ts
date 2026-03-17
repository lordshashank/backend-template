"use client";

import { useEffect, useRef } from "react";
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type QueryKey,
} from "@tanstack/react-query";

const WS_URL = "ws://localhost:3002";

let sharedWs: WebSocket | null = null;
let subscribers = new Map<string, Set<() => void>>();
let connectAttempt = 0;

function getWs(): WebSocket | null {
  if (typeof window === "undefined") return null;

  if (sharedWs && sharedWs.readyState === WebSocket.OPEN) return sharedWs;
  if (sharedWs && sharedWs.readyState === WebSocket.CONNECTING) return sharedWs;

  connectAttempt++;
  const attempt = connectAttempt;

  try {
    const ws = new WebSocket(WS_URL);
    sharedWs = ws;

    ws.onopen = () => {
      // Re-subscribe all active subscriptions
      for (const resource of subscribers.keys()) {
        ws.send(JSON.stringify({ subscribe: resource }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.invalidate && Array.isArray(msg.invalidate)) {
          const resource = msg.invalidate[0];
          const callbacks = subscribers.get(resource);
          if (callbacks) {
            for (const cb of callbacks) cb();
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (attempt === connectAttempt) {
        sharedWs = null;
        // Reconnect after delay
        setTimeout(() => getWs(), 3000);
      }
    };

    ws.onerror = () => {
      // Will trigger onclose
    };

    return ws;
  } catch {
    return null;
  }
}

function subscribe(resource: string, callback: () => void): () => void {
  let callbacks = subscribers.get(resource);
  const isNew = !callbacks;
  if (!callbacks) {
    callbacks = new Set();
    subscribers.set(resource, callbacks);
  }
  callbacks.add(callback);

  // Subscribe on the WebSocket if this is a new resource
  if (isNew) {
    const ws = getWs();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ subscribe: resource }));
    }
  }

  return () => {
    callbacks!.delete(callback);
    if (callbacks!.size === 0) {
      subscribers.delete(resource);
      const ws = sharedWs;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ unsubscribe: resource }));
      }
    }
  };
}

export function useRealtimeQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  const queryClient = useQueryClient();
  const unsubRef = useRef<(() => void) | null>(null);

  const result = useQuery<T>({
    queryKey,
    queryFn,
    ...options,
  });

  useEffect(() => {
    const resource = queryKey[0] as string;

    // Initialize WebSocket connection
    getWs();

    unsubRef.current = subscribe(resource, () => {
      queryClient.invalidateQueries({ queryKey });
    });

    return () => {
      unsubRef.current?.();
    };
  }, [JSON.stringify(queryKey)]);

  return result;
}
