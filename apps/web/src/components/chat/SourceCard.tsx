"use client";

import type { Citation } from "../../lib/types";

type Props = {
  citation: Citation;
  lit: boolean;
  onEnter: () => void;
  onLeave: () => void;
};

export function SourceCard({ citation, lit, onEnter, onLeave }: Props) {
  return (
    <div
      id={`src-${citation.rank}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`mb-1.5 grid grid-cols-[24px_1fr] gap-[13px] rounded-[10px] border p-[12px_13px] transition-[background-color,border-color] duration-[180ms] hover:border-rule-2 hover:bg-paper-2 ${
        lit ? "border-rule-2 bg-paper-2" : "border-transparent"
      }`}
    >
      <div className="grid h-5 place-items-center rounded-[5px] bg-accent-bg font-mono text-[10.5px] font-medium text-accent">
        {citation.rank}
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5">
          <span className="truncate text-[11.5px] font-medium tracking-[-0.006em] text-ink-2">
            {citation.headingPath ?? "Untitled section"}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-3">
            {citation.score.toFixed(2)}
          </span>
        </div>

        {citation.snippet ? (
          <p className="mt-1 text-[13.5px] leading-[1.62] tracking-[-0.007em] text-ink-2">
            {citation.snippet}
          </p>
        ) : null}
      </div>
    </div>
  );
}
