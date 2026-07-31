"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError, clearToken, readToken, writeToken } from "../lib/api";
import { qk } from "../lib/query-keys";

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

export function useLogin() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (session) => {
      writeToken(session.token);
      client.invalidateQueries();
    },
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
    mutationFn: api.logout,
    onSettled: () => {
      clearToken();
      client.clear();
      client.invalidateQueries();
    },
  });
}
