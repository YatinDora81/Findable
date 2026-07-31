"use client";

import { relativeTime, stripScheme } from "../../lib/format";
import type { Source } from "../../lib/types";
import { StatusDot, statusLabel } from "../source/StatusBadge";

type Props = {
  source: Source;
  active: boolean;
  onSelect: () => void;
  onRetry: () => void;
};

export function SourceListItem({ source, active, onSelect, onRetry }: Props) {
  const failed = source.indexStatus === "FAILED";
  const title = stripScheme(source.title);

  return (
    <div
      className={`relative rounded-[9px] transition-[background-color] duration-[160ms] hover:bg-paper-2 ${
        active ? "bg-paper-2" : ""
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className="absolute inset-0 rounded-[9px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg"
      >
        <span className="sr-only">{title}</span>
      </button>

      {active && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[11px] left-0 top-[11px] w-0.5 rounded-sm bg-accent"
        />
      )}

      <div className="pointer-events-none relative p-[10px_12px]">
        <span className="inline-flex rounded border border-rule-2 px-[5px] py-[1.5px] font-mono text-[8.5px] font-medium tracking-[0.09em] text-ink-3">
          {source.kind}
        </span>

        <h3 className="mt-1.5 line-clamp-2 text-[13.5px] font-medium leading-[1.4] tracking-[-0.012em] text-ink">
          {title}
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] text-ink-3">
          <StatusDot status={source.indexStatus} />
          <span>
            {source.indexStatus === "READY"
              ? `${source.chunkCount} chunks`
              : statusLabel(source.indexStatus)}
          </span>
          <span aria-hidden="true" className="h-[9px] w-px bg-rule-2" />
          <span>{relativeTime(source.createdAt)}</span>
        </div>

        {failed && (
          <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] text-err">
            {source.errorCode && <span>{source.errorCode}</span>}
            <button
              type="button"
              onClick={onRetry}
              className="pointer-events-auto rounded-sm font-sans text-[10.5px] font-medium text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
