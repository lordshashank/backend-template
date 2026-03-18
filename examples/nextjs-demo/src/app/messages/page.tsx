"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, setJwtToken, getJwtToken } from "@/lib/api";
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

type AuthMode = "cookie" | "jwt";

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [messageText, setMessageText] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("cookie");

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

  // Cookie login
  const cookieLogin = useMutation({
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

  // JWT login
  const jwtLogin = useMutation({
    mutationFn: (name: string) =>
      api<{ userId: string; token: string }>("/auth/jwt/login", {
        method: "POST",
        body: JSON.stringify({ username: name }),
      }),
    onSuccess: (data) => {
      setJwtToken(data.token);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      setUsername("");
    },
  });

  const login = authMode === "cookie" ? cookieLogin : jwtLogin;

  // Logout
  const logout = useMutation({
    mutationFn: async () => {
      if (getJwtToken()) {
        // JWT: just clear the token client-side
        setJwtToken(null);
      } else {
        // Cookie: hit the logout endpoint
        await api("/auth/logout", { method: "POST" });
      }
    },
    onSuccess: () => {
      queryClient.resetQueries({ queryKey: ["auth"] });
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

  const handleSwitchMode = (mode: AuthMode) => {
    if (isLoggedIn) {
      logout.mutate();
    }
    setJwtToken(null);
    setAuthMode(mode);
    queryClient.resetQueries({ queryKey: ["auth"] });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {/* Auth mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500 uppercase tracking-wide">Auth mode:</span>
        <button
          onClick={() => handleSwitchMode("cookie")}
          className={`text-xs px-3 py-1 rounded ${
            authMode === "cookie"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          Cookie
        </button>
        <button
          onClick={() => handleSwitchMode("jwt")}
          className={`text-xs px-3 py-1 rounded ${
            authMode === "jwt"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          JWT
        </button>
      </div>

      {/* Auth section */}
      <div className="rounded-lg border border-zinc-800 p-4 mb-6">
        {isLoggedIn ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Logged in as{" "}
              <strong className="text-zinc-200">{me.data.userId}</strong>
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                {me.data.strategy}
              </span>
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
              Login ({authMode === "cookie" ? "Cookie" : "JWT"})
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
