"use client";

import { useState, useRef } from "react";

interface RequestResult {
  status: number;
  timestamp: number;
}

export default function RateLimitPage() {
  const [results, setResults] = useState<RequestResult[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fireRequests = async (count: number, delayMs: number) => {
    setResults([]);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    for (let i = 0; i < count; i++) {
      if (controller.signal.aborted) break;

      try {
        const res = await fetch("/api/health", {
          signal: controller.signal,
        });
        setResults((prev) => [
          ...prev,
          { status: res.status, timestamp: Date.now() },
        ]);
      } catch (err) {
        if ((err as Error).name === "AbortError") break;
        setResults((prev) => [...prev, { status: 0, timestamp: Date.now() }]);
      }

      if (delayMs > 0 && i < count - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    setRunning(false);
  };

  const stop = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const successful = results.filter((r) => r.status === 200).length;
  const rateLimited = results.filter((r) => r.status === 429).length;
  const errors = results.filter(
    (r) => r.status !== 200 && r.status !== 429
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Rate Limit Demo</h1>

      <p className="text-sm text-zinc-500 mb-6">
        The backend rate-limits to 100 requests/minute per IP per route by
        default. Fire rapid requests to see 429 (Too Many Requests) responses.
      </p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => fireRequests(30, 0)}
          disabled={running}
          className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Fire 30 (no delay)
        </button>
        <button
          onClick={() => fireRequests(150, 0)}
          disabled={running}
          className="text-sm px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50"
        >
          Fire 150 (burst)
        </button>
        <button
          onClick={() => fireRequests(50, 200)}
          disabled={running}
          className="text-sm px-4 py-2 rounded bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-50"
        >
          Fire 50 (200ms gap)
        </button>
        {running && (
          <button
            onClick={stop}
            className="text-sm px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500"
          >
            Stop
          </button>
        )}
      </div>

      {/* Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded border border-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {successful}
            </div>
            <div className="text-xs text-zinc-500 mt-1">200 OK</div>
          </div>
          <div className="rounded border border-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {rateLimited}
            </div>
            <div className="text-xs text-zinc-500 mt-1">429 Rate Limited</div>
          </div>
          <div className="rounded border border-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{errors}</div>
            <div className="text-xs text-zinc-500 mt-1">Errors</div>
          </div>
        </div>
      )}

      {/* Request log */}
      {results.length > 0 && (
        <div className="rounded border border-zinc-800 p-4 max-h-80 overflow-y-auto">
          <div className="text-xs text-zinc-500 mb-2">
            Request log ({results.length} total)
          </div>
          <div className="space-y-0.5 font-mono text-xs">
            {results.map((r, i) => (
              <div
                key={i}
                className={
                  r.status === 200
                    ? "text-green-500"
                    : r.status === 429
                      ? "text-yellow-500"
                      : "text-red-500"
                }
              >
                #{String(i + 1).padStart(3, "0")} → {r.status || "ERR"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
