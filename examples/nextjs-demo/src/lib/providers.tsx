"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorPingProvider } from "errorping/react";
import { Severity } from "errorping";
import type { ErrorPingConfig } from "errorping";

const errorPingConfig: ErrorPingConfig = {
  appName: "backend-template-demo",
  channels: [
    {
      type: "webhook" as const,
      url: process.env.NEXT_PUBLIC_ERRORPING_URL ?? "http://localhost:3001/errorping",
      name: "backend",
    },
  ],
  captureConsoleErrors: true,
  captureUnhandledRejections: true,
  captureUncaughtExceptions: true,
  minSeverity: Severity.INFO,
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorPingProvider
        config={errorPingConfig}
        fallback={({ error, reset }) => (
          <div className="p-8 max-w-lg mx-auto mt-12">
            <h2 className="text-xl font-bold text-red-400 mb-4">
              Error Boundary caught a render error
            </h2>
            <pre className="bg-red-950 text-red-300 p-4 rounded-lg text-sm overflow-auto mb-4">
              {error.message}
            </pre>
            <p className="text-sm text-zinc-500 mb-4">
              This error was captured by errorping and sent to the backend.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Try again
            </button>
          </div>
        )}
      >
        {children}
      </ErrorPingProvider>
    </QueryClientProvider>
  );
}
