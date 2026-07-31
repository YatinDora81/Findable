"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import type { Message } from "../../lib/types";
import { Thinking } from "./Thinking";
import { Turn } from "./Turn";

type Props = {
  messages: Message[];
  pending: boolean;
  chunkCount: number;
  emptyState: ReactNode;
};

export function Thread({ messages, pending, chunkCount, emptyState }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  const last = messages[messages.length - 1];
  const empty = messages.length === 0 && !pending;

  return (
    <div className="scroll-paper flex-1 overflow-y-auto px-10 pb-5 pt-8">
      <div className="mx-auto max-w-[648px]">
        {empty
          ? emptyState
          : messages.map((message) => (
              <Turn key={message.id} message={message} />
            ))}

        {pending ? (
          <div className="mb-9">
            <Thinking chunkCount={chunkCount} />
          </div>
        ) : null}

        <div aria-live="polite" aria-atomic="false" className="sr-only">
          {pending
            ? "Searching sources"
            : last?.role === "ASSISTANT"
              ? "Answer ready"
              : ""}
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
