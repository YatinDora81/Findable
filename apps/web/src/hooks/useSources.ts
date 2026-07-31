"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "../lib/api";
import { qk } from "../lib/query-keys";
import type { CreateSourceInput, Source } from "../lib/types";

const isPending = (status: Source["indexStatus"]) =>
  status === "PENDING" || status === "PROCESSING";

export function useSources(enabled = true) {
  return useQuery({
    queryKey: qk.sources,
    queryFn: api.listSources,
    enabled,
    refetchInterval: (query) =>
      query.state.data?.some((source) => isPending(source.indexStatus))
        ? 2000
        : false,
  });
}

export function useSource(id: string | null) {
  return useQuery({
    queryKey: qk.source(id ?? ""),
    queryFn: () => api.getSource(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && isPending(query.state.data.indexStatus) ? 2000 : false,
  });
}

export function useIngest(onCreated?: (source: Source) => void) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSourceInput) => api.createSource(input),

    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: qk.sources });
      const previous = client.getQueryData<Source[]>(qk.sources);

      const optimistic = {
        id: `optimistic-${Date.now()}`,
        kind: input.type === "link" ? "LINK" : "TEXT",
        title:
          input.type === "link" ? input.url : (input.title ?? "Untitled note"),
        indexStatus: "PENDING",
        chunkCount: 0,
        url: input.type === "link" ? input.url : null,
        createdAt: new Date().toISOString(),
      } as Source;

      client.setQueryData<Source[]>(qk.sources, (old = []) => [
        optimistic,
        ...old,
      ]);

      return { previous };
    },

    onSuccess: (source) => {
      onCreated?.(source);
    },

    onError: (error, _input, context) => {
      client.setQueryData(qk.sources, context?.previous);

      if (error instanceof ApiError && error.code === "DUPLICATE_SOURCE") {
        const existing = (error.details as { id?: string } | undefined)?.id;
        toast("You already saved this", {
          action: existing
            ? {
                label: "Open",
                onClick: () => onCreated?.({ id: existing } as Source),
              }
            : undefined,
        });
        return;
      }

      toast.error(error.message);
    },

    onSettled: () => client.invalidateQueries({ queryKey: qk.sources }),
  });
}

export function useReindex() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.reindex(id),
    onSuccess: (source) => {
      client.invalidateQueries({ queryKey: qk.sources });
      client.invalidateQueries({ queryKey: qk.source(source.id) });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteSource(onDeleted?: () => void) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteSource(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.sources });
      onDeleted?.();
    },
    onError: (error) => toast.error(error.message),
  });
}
