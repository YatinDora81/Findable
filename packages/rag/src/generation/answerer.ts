import { ThinkingLevel } from "@google/genai";
import { env } from "@repo/config";
import { AppError } from "@repo/contracts";
import { callGemini } from "../gemini/key-ring.ts";
import type { Hit } from "../retrieval/retriever.ts";

const SYSTEM = `You answer questions using only the numbered sources provided.
Put [n] immediately after each claim, matching the source number.
If the sources do not contain the answer, say so plainly and do not use outside knowledge.
Never combine facts from unrelated sources into a single claim.
Be concise.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    usedSources: { type: "array", items: { type: "integer" } },
    hasAnswer: { type: "boolean" },
  },
  required: ["answer", "usedSources", "hasAnswer"],
};

export type Answer = {
  answer: string;
  hasAnswer: boolean;
  used: number[];
  usage: {
    promptTokens?: number;
    completionTokens?: number;
  };
};

export async function answer(question: string, hits: Hit[]): Promise<Answer> {
  const context = hits
    .map((hit, index) => `[${index + 1}]\n${hit.text}`)
    .join("\n\n");

  const response = await callGemini("generating an answer", (client) =>
    client.models.generateContent({
      model: env.GENERATION_MODEL,
      contents: `${context}\n\nQuestion: ${question}`,
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    }),
  );

  const text = response.text;

  if (!text) {
    throw new AppError("UPSTREAM_ERROR", "Gemini returned an empty answer");
  }

  const parsed = parse(text);

  const used = [...new Set(parsed.usedSources)].filter(
    (rank) => Number.isInteger(rank) && rank >= 1 && rank <= hits.length,
  );

  return {
    answer: parsed.answer,
    hasAnswer: parsed.hasAnswer,
    used,
    usage: {
      promptTokens: response.usageMetadata?.promptTokenCount,
      completionTokens: response.usageMetadata?.candidatesTokenCount,
    },
  };
}

type ParsedAnswer = {
  answer: string;
  usedSources: number[];
  hasAnswer: boolean;
};

function parse(text: string): ParsedAnswer {
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch {
    throw new AppError("UPSTREAM_ERROR", "Gemini returned malformed json");
  }

  if (typeof raw !== "object" || raw === null) {
    throw new AppError("UPSTREAM_ERROR", "Gemini returned an unexpected shape");
  }

  const record = raw as Record<string, unknown>;

  if (typeof record.answer !== "string") {
    throw new AppError("UPSTREAM_ERROR", "Gemini returned an answer without text");
  }

  return {
    answer: record.answer,
    hasAnswer: record.hasAnswer !== false,
    usedSources: Array.isArray(record.usedSources)
      ? record.usedSources.filter(
          (value): value is number => typeof value === "number",
        )
      : [],
  };
}
