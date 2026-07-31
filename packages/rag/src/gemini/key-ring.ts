import { GoogleGenAI } from "@google/genai";
import { env } from "@repo/config";
import { createLogger } from "@repo/logger";
import {
  inspectFailure,
  isKeyFault,
  isQuotaExhausted,
  isRetryable,
  toAppError,
  type UpstreamFailure,
} from "./errors.ts";

const log = createLogger("gemini");

const RATE_LIMIT_BASE_MS = 2_000;
const RATE_LIMIT_CEILING_MS = 60_000;
const QUOTA_CEILING_MS = 300_000;
const TRANSIENT_BASE_MS = 500;
const TRANSIENT_CEILING_MS = 20_000;

type Slot = {
  name: string;
  client: GoogleGenAI;
  availableAt: number;
  failures: number;
  disabled: boolean;
};

const slots: Slot[] = env.GEMINI_API_KEYS.map((entry) => ({
  name: entry.name,
  client: new GoogleGenAI({
    apiKey: entry.key,
    httpOptions: { timeout: env.FETCH_TIMEOUT_MS * 6 },
  }),
  availableAt: 0,
  failures: 0,
  disabled: false,
}));

let cursor = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jitter = (ms: number) => Math.round(ms * (0.5 + Math.random()));

const usable = () => slots.filter((slot) => !slot.disabled);

function pick(now: number): { slot: Slot; waitMs: number } | null {
  const candidates = usable();
  if (candidates.length === 0) return null;

  let earliest: Slot | undefined;

  for (let offset = 0; offset < slots.length; offset++) {
    const slot = slots[(cursor + offset) % slots.length];
    if (!slot || slot.disabled) continue;

    if (slot.availableAt <= now) {
      cursor = (cursor + offset + 1) % slots.length;
      return { slot, waitMs: 0 };
    }

    if (!earliest || slot.availableAt < earliest.availableAt) earliest = slot;
  }

  const fallback = earliest ?? candidates[0];
  if (!fallback) return null;

  return { slot: fallback, waitMs: Math.max(0, fallback.availableAt - now) };
}

function penalize(slot: Slot, failure: UpstreamFailure): number {
  slot.failures += 1;

  const growth = 2 ** Math.min(slot.failures - 1, 6);

  const cooldown = isQuotaExhausted(failure)
    ? Math.min(RATE_LIMIT_BASE_MS * growth * 10, QUOTA_CEILING_MS)
    : failure.status === 429
      ? Math.min(RATE_LIMIT_BASE_MS * growth, RATE_LIMIT_CEILING_MS)
      : Math.min(TRANSIENT_BASE_MS * growth, TRANSIENT_CEILING_MS);

  const withJitter = jitter(cooldown);
  slot.availableAt = Date.now() + withJitter;

  return withJitter;
}

export async function callGemini<T>(
  action: string,
  operation: (client: GoogleGenAI) => Promise<T>,
): Promise<T> {
  const attempts = Math.max(5, slots.length * 2);
  let last: UpstreamFailure = { status: null, reason: null, message: "unknown" };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const next = pick(Date.now());

    if (!next) {
      log.error({ action }, "gemini.keys.exhausted");
      throw toAppError({ status: 403, reason: null, message: "no keys" }, action);
    }

    const { slot, waitMs } = next;

    if (waitMs > 0) {
      log.warn({ action, key: slot.name, waitMs }, "gemini.keys.all_cooling");
      await sleep(waitMs);
    }

    try {
      const result = await operation(slot.client);

      if (slot.availableAt <= Date.now()) {
        slot.failures = 0;
        slot.availableAt = 0;
      }

      return result;
    } catch (error) {
      const failure = inspectFailure(error);
      last = failure;

      if (isKeyFault(failure)) {
        slot.disabled = true;
        log.error(
          { action, key: slot.name, status: failure.status, remaining: usable().length },
          "gemini.key.disabled",
        );
        continue;
      }

      if (!isRetryable(failure)) {
        log.error(
          { action, key: slot.name, status: failure.status },
          "gemini.call.rejected",
        );
        throw toAppError(failure, action);
      }

      const cooldownMs = penalize(slot, failure);
      log.warn(
        {
          action,
          key: slot.name,
          attempt,
          status: failure.status,
          reason: failure.reason,
          cooldownMs,
        },
        "gemini.key.cooling",
      );
    }
  }

  throw toAppError(last, action);
}

export function keyRingStatus() {
  const now = Date.now();

  return slots.map((slot) => ({
    name: slot.name,
    disabled: slot.disabled,
    available: !slot.disabled && slot.availableAt <= now,
    failures: slot.failures,
    cooldownMs: Math.max(0, slot.availableAt - now),
  }));
}
