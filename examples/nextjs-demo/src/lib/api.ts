const BASE = "/api";

let jwtToken: string | null = null;
let jwtLoaded = false;
const JWT_STORAGE_KEY = "backend-template-demo.jwt";

function loadJwtToken() {
  if (jwtLoaded || typeof window === "undefined") return;
  jwtLoaded = true;
  jwtToken = window.localStorage.getItem(JWT_STORAGE_KEY);
}

export function setJwtToken(token: string | null) {
  jwtToken = token;
  jwtLoaded = true;
  if (typeof window !== "undefined") {
    if (token) {
      window.localStorage.setItem(JWT_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(JWT_STORAGE_KEY);
    }
  }
}

export function getJwtToken(): string | null {
  loadJwtToken();
  return jwtToken;
}

export async function api<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  loadJwtToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? "Request failed");
  }

  return data as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
