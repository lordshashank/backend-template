"use client";

import { useErrorPing } from "errorping/react";
import { Severity } from "errorping";

export default function ErrorpingPage() {
  const { captureError, captureMessage } = useErrorPing();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Errorping</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Click buttons to trigger errors. They get captured by errorping, sent to
        the backend via webhook, stored in Postgres, and forwarded to Telegram.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => {
            throw new Error("Event handler error: button click exploded");
          }}
          className="block w-full text-left px-4 py-3 rounded-lg border border-zinc-800 hover:border-zinc-600 transition"
        >
          <span className="text-red-400 font-medium">Throw in event handler</span>
          <span className="block text-xs text-zinc-500 mt-1">
            Caught by window.onerror → severity CRITICAL
          </span>
        </button>

        <button
          onClick={() => {
            Promise.reject(
              new Error("Unhandled rejection: async operation failed")
            );
          }}
          className="block w-full text-left px-4 py-3 rounded-lg border border-zinc-800 hover:border-zinc-600 transition"
        >
          <span className="text-orange-400 font-medium">Unhandled promise rejection</span>
          <span className="block text-xs text-zinc-500 mt-1">
            Caught by unhandledrejection listener → severity ERROR
          </span>
        </button>

        <button
          onClick={() => {
            captureError(new Error("Manual captureError call"), {
              severity: Severity.ERROR,
              context: { url: "/errorping", method: "POST" },
            });
          }}
          className="block w-full text-left px-4 py-3 rounded-lg border border-zinc-800 hover:border-zinc-600 transition"
        >
          <span className="text-red-400 font-medium">Manual captureError</span>
          <span className="block text-xs text-zinc-500 mt-1">
            Direct API call with custom context → severity ERROR
          </span>
        </button>

        <button
          onClick={() => {
            captureMessage("User triggered a warning from the demo page", {
              severity: Severity.WARNING,
            });
          }}
          className="block w-full text-left px-4 py-3 rounded-lg border border-zinc-800 hover:border-zinc-600 transition"
        >
          <span className="text-yellow-400 font-medium">Manual captureMessage</span>
          <span className="block text-xs text-zinc-500 mt-1">
            Message without an Error object → severity WARNING
          </span>
        </button>

        <button
          onClick={() => {
            console.error("Console error: this was logged via console.error()");
          }}
          className="block w-full text-left px-4 py-3 rounded-lg border border-zinc-800 hover:border-zinc-600 transition"
        >
          <span className="text-red-400 font-medium">console.error()</span>
          <span className="block text-xs text-zinc-500 mt-1">
            Auto-captured by console patcher → severity ERROR
          </span>
        </button>
      </div>

      <div className="mt-8 p-4 rounded-lg bg-zinc-900 text-sm text-zinc-500">
        <strong className="text-zinc-300">How it works:</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>
            <code className="text-zinc-400">ErrorPingProvider</code> wraps the
            app with an error boundary + global listeners
          </li>
          <li>
            Errors are sent to{" "}
            <code className="text-zinc-400">POST /errorping</code> via webhook
          </li>
          <li>Backend stores in Postgres and forwards to Telegram</li>
          <li>
            Query errors with the{" "}
            <code className="text-zinc-400">errorping</code> CLI
          </li>
        </ul>
      </div>
    </div>
  );
}
