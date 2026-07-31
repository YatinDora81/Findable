"use client";

import type { Source } from "../../lib/types";
import { SourceListItem } from "./SourceListItem";

type Props = {
  sources: Source[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onRetry: (id: string) => void;
};

export function SourceList({
  sources,
  activeId,
  loading,
  onSelect,
  onRetry,
}: Props) {
  return (
    <>
      <div className="flex items-center justify-between p-[14px_20px_7px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">
        <span>Sources</span>
        <span>{loading ? "—" : sources.length}</span>
      </div>

      <div className="scroll-paper min-h-0 flex-1 overflow-y-auto px-[9px] pb-3.5">
        {!loading && sources.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12.5px] leading-[1.6] text-ink-3">
            Nothing saved yet. Add a note or a link to get started.
          </p>
        ) : (
          sources.map((source) => (
            <SourceListItem
              key={source.id}
              source={source}
              active={source.id === activeId}
              onSelect={() => onSelect(source.id)}
              onRetry={() => onRetry(source.id)}
            />
          ))
        )}
      </div>
    </>
  );
}
