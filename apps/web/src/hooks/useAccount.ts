"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError, clearToken, readToken, writeToken } from "../lib/api";
import { qk } from "../lib/query-keys";

function switchSession(token: string): void {
  writeToken(token);
  window.location.assign("/");
}

export function useAccount() {
  return useQuery({
    queryKey: qk.account,
    queryFn: async () => {
      if (!readToken()) return null;
      try {
        return await api.me();
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          clearToken();
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });
}

export function useGuestSession() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: api.guest,
    onSuccess: (session) => {
      writeToken(session.token);
      client.invalidateQueries();
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: { email: string; password: string; name?: string }) =>
      api.register(body),
    onSuccess: (session) => switchSession(session.token),
    onError: (error) =>
      toast.error(
        error instanceof ApiError && error.code === "EMAIL_TAKEN"
          ? "That email already has an inbox, sign in instead"
          : error.message,
      ),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (session) => switchSession(session.token),
    onError: (error) =>
      toast.error(
        error instanceof ApiError && error.status === 403
          ? "Invalid email or password"
          : error.message,
      ),
  });
}

export function useLogout() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.logout().catch(() => {});
      clearToken();
      client.clear();

      const guest = await api.guest();
      return guest.token;
    },
    onSuccess: (token) => switchSession(token),
    onError: () => {
      clearToken();
      client.clear();
      window.location.assign("/");
    },
  });
}
