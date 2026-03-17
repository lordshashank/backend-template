"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useRealtimeQuery } from "@/lib/use-realtime-query";

interface Message {
  id: number;
  author: string;
  text: string;
  created_at: string;
}

interface User {
  userId: string;
  strategy: string;
}

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [messageText, setMessageText] = useState("");

  // Auth state
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<User>("/auth/me"),
    retry: false,
  });

  const isLoggedIn = !!me.data;

  // Messages — uses real-time invalidation when WS is connected
  const messages = useRealtimeQuery<Message[]>(["messages"], () =>
    api<Message[]>("/messages")
  );

  // Login
  const login = useMutation({
    mutationFn: (name: string) =>
      api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      setUsername("");
    },
  });

  // Logout
  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  // Post message
  const postMessage = useMutation({
    mutationFn: (text: string) =>
      api("/messages", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setMessageText("");
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {/* Auth section */}
      <div className="rounded-lg border border-zinc-800 p-4 mb-6">
        {isLoggedIn ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Logged in as{" "}
              <strong className="text-zinc-200">{me.data.userId}</strong>
            </span>
            <button
              onClick={() => logout.mutate()}
              className="text-sm px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Logout
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (username.trim()) login.mutate(username.trim());
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter a username"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={login.isPending}
              className="text-sm px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Login
            </button>
          </form>
        )}
        {login.isError && (
          <p className="text-red-400 text-xs mt-2">
            {(login.error as ApiError).message}
          </p>
        )}
      </div>

      {/* Post message form */}
      {isLoggedIn && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (messageText.trim()) postMessage.mutate(messageText.trim());
          }}
          className="flex gap-2 mb-6"
        >
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={postMessage.isPending}
            className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}

      {postMessage.isError && (
        <p className="text-red-400 text-xs mb-4">
          {(postMessage.error as ApiError).message}
        </p>
      )}

      {/* Realtime hint */}
      <div className="text-xs text-zinc-600 mb-4 p-3 rounded bg-zinc-900 border border-zinc-800">
        Open this page in two browser tabs. Messages posted in one will appear
        in the other via WebSocket invalidation + React Query refetch.
        <br />
        Requires ENABLE_REALTIME=true on the backend.
      </div>

      {/* Messages list */}
      <div className="space-y-2">
        {messages.isLoading && (
          <p className="text-zinc-500 text-sm">Loading messages...</p>
        )}

        {messages.isError && (
          <p className="text-red-400 text-sm">
            Failed to load messages. Is the backend running?
          </p>
        )}

        {messages.data?.length === 0 && (
          <p className="text-zinc-600 text-sm">
            No messages yet. Login and send one!
          </p>
        )}

        {messages.data?.map((msg) => (
          <div
            key={msg.id}
            className="rounded border border-zinc-800 px-4 py-3"
          >
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-medium text-zinc-300">
                {msg.author}
              </span>
              <span className="text-xs text-zinc-600">
                {new Date(msg.created_at).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-zinc-400">{msg.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
