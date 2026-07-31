export type IndexStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
export type SourceKind = "TEXT" | "LINK";
export type MessageRole = "USER" | "ASSISTANT";

export type Source = {
  id: string;
  userId: string;
  title: string;
  kind: SourceKind;
  indexStatus: IndexStatus;
  url: string | null;
  chunkCount: number;
  tokenCount: number | null;
  embeddingModel: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  indexedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastAskedAt: string;
};

export type Citation = {
  id?: string;
  rank: number;
  chunkId: string | null;
  score: number;
  snippet: string | null;
  headingPath: string | null;
  wasCited?: boolean;
};

export type Message = {
  id: string;
  sourceId: string;
  role: MessageRole;
  content: string;
  retrievalMs: number | null;
  generationMs: number | null;
  createdAt: string;
  citations: Citation[];
};

export type AnswerResponse = {
  messageId: string;
  answer: string;
  hasAnswer?: boolean;
  citations: Citation[];
  usage?: { promptTokens?: number; completionTokens?: number };
  timings: { retrievalMs: number; generationMs: number };
};

export type CreateSourceInput =
  | { type: "text"; title?: string; content: string }
  | { type: "link"; url: string };

export type GuestSession = {
  token: string;
  expiresAt: string;
  credentials: { email: string; password: string };
  user: { id: string; email: string; name: string; isGuest: boolean };
};

export type Account = {
  id: string;
  email: string;
  name: string | null;
  isGuest: boolean;
  createdAt: string;
};
