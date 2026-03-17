"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface HealthResponse {
  status: string;
  timestamp: string;
}

export default function Home() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<HealthResponse>("/health"),
    refetchInterval: 5_000,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Health Check</h1>

      <div className="rounded-lg border border-zinc-800 p-6">
        {health.isLoading && (
          <p className="text-zinc-500">Checking backend...</p>
        )}

        {health.isError && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400 font-medium">Offline</span>
            </div>
            <p className="text-sm text-zinc-500">
              Make sure the backend is running on port 3001.
            </p>
            <pre className="text-xs text-zinc-600 mt-2">
              cd ../.. && docker compose up
            </pre>
          </div>
        )}

        {health.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-400 font-medium">Online</span>
            </div>
            <div className="text-sm text-zinc-500">
              <p>Status: {health.data.status}</p>
              <p>
                Timestamp:{" "}
                {new Date(health.data.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-3 text-sm text-zinc-500">
        <h2 className="text-lg font-semibold text-zinc-300">
          What this demo covers
        </h2>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong className="text-zinc-300">Health</strong> — this page polls
            GET /health every 5s
          </li>
          <li>
            <strong className="text-zinc-300">Messages</strong> — CRUD with
            cookie auth + real-time invalidation via WebSocket
          </li>
          <li>
            <strong className="text-zinc-300">Rate Limit</strong> — fires rapid
            requests to see 429 responses
          </li>
          <li>
            <strong className="text-zinc-300">Errorping</strong> — trigger
            errors and see them captured, stored, and sent to Telegram
          </li>
        </ul>
      </div>
    </div>
  );
}
