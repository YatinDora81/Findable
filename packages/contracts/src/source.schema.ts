import { z } from "zod";

export const indexStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "READY",
  "FAILED",
]);

export const createSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(10).max(200_000),
  }),
  z.object({
    type: z.literal("link"),
    url: z
      .url()
      .refine((value) => /^https?:\/\//i.test(value), "http(s) urls only"),
  }),
]);

export const listSourcesSchema = z.object({
  status: indexStatusSchema.optional(),
  cursor: z.cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const sourceIdSchema = z.object({
  id: z.cuid("invalid source id"),
});

export const querySchema = z.object({
  question: z.string().trim().min(3).max(2000),
  topK: z.coerce.number().int().min(1).max(20).optional(),
});

export const listMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const aliasQuerySchema = querySchema.extend({
  projectId: z.cuid("invalid projectId"),
});

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type ListSourcesInput = z.infer<typeof listSourcesSchema>;
export type QueryInput = z.infer<typeof querySchema>;
export type IndexStatus = z.infer<typeof indexStatusSchema>;
