import type {
  Account,
  AnswerResponse,
  CreateSourceInput,
  GuestSession,
  Message,
  Source,
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const TOKEN_KEY = "findable.token";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const readToken = (): string | null =>
  typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);

export const writeToken = (token: string): void => {
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  window.localStorage.removeItem(TOKEN_KEY);
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readToken();

  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const error = json?.error;
    throw new ApiError(
      error?.code ?? "UNKNOWN",
      error?.message ?? "Request failed",
      res.status,
      error?.details,
    );
  }

  return json.data as T;
}

export const api = {
  guest: () => request<GuestSession>("/auth/guest", { method: "POST" }),

  login: (email: string, password: string) =>
    request<{ token: string; expiresAt: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<Account>("/auth/me"),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  listSources: () => request<Source[]>("/sources"),

  getSource: (id: string) => request<Source>(`/sources/${id}`),

  createSource: (body: CreateSourceInput) =>
    request<Source>("/sources", { method: "POST", body: JSON.stringify(body) }),

  deleteSource: (id: string) =>
    request<void>(`/sources/${id}`, { method: "DELETE" }),

  reindex: (id: string) =>
    request<Source>(`/sources/${id}/reindex`, { method: "POST" }),

  messages: (id: string) => request<Message[]>(`/sources/${id}/messages`),

  ask: (id: string, question: string) =>
    request<AnswerResponse>(`/sources/${id}/query`, {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
};
