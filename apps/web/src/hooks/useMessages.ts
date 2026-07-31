"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { qk } from "../lib/query-keys";
import type { Message } from "../lib/types";

export function useMessages(sourceId: string | null, enabled = true) {
  return useQuery({
    queryKey: qk.messages(sourceId ?? ""),
    queryFn: () => api.messages(sourceId as string),
    enabled: Boolean(sourceId) && enabled,
  });
}

export function useAsk(sourceId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (question: string) => api.ask(sourceId, question),

    onMutate: async (question) => {
      await client.cancelQueries({ queryKey: qk.messages(sourceId) });
      const previous = client.getQueryData<Message[]>(qk.messages(sourceId));

      client.setQueryData<Message[]>(qk.messages(sourceId), (old = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          sourceId,
          role: "USER",
          content: question,
          retrievalMs: null,
          generationMs: null,
          createdAt: new Date().toISOString(),
          citations: [],
        },
      ]);

      return { previous };
    },

    onError: (error, _question, context) => {
      client.setQueryData(qk.messages(sourceId), context?.previous);
      toast.error(error.message);
    },

    onSettled: () => {
      client.invalidateQueries({ queryKey: qk.messages(sourceId) });
      client.invalidateQueries({ queryKey: qk.sources });
    },
  });
}
