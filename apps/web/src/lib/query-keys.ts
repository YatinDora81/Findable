export const qk = {
  account: ["account"] as const,
  sources: ["sources"] as const,
  source: (id: string) => ["sources", id] as const,
  messages: (id: string) => ["messages", id] as const,
};
