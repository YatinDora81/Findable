"use client";

import type { Source } from "../../lib/types";
import { hostOf, stripScheme } from "../../lib/format";
import { RefreshIcon, TrashIcon } from "../icons";
import { IconButton } from "../ui/IconButton";
import { StatusBadge } from "./StatusBadge";

type Props = {
  source: Source;
  onReindex: () => void;
  onDelete: () => void;
  busy?: boolean;
};

function Divider() {
  return <span aria-hidden="true" className="h-[9px] w-px bg-rule-2" />;
}

export function DocumentHeader({
  source,
  onReindex,
  onDelete,
  busy = false,
}: Props) {
  const host = hostOf(source.url);
  const title = source.url ? stripScheme(source.title) : source.title;

  return (
    <header className="flex items-start justify-between gap-6 border-b border-rule px-10 pb-[18px] pt-[22px]">
      <div className="min-w-0">
        <h2 className="max-w-[32ch] truncate text-[24px] font-semibold leading-[1.22] tracking-[-0.032em] text-ink">
          {title}
        </h2>
        <div className="mt-[7px] flex items-center gap-[9px] font-mono text-[10.5px] text-ink-3">
          {host && source.url ? (
            <>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="border-b border-rule-2 transition-[color,border-color] duration-[160ms] hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg"
              >
                {host}
              </a>
              <Divider />
            </>
          ) : null}
          <span>{source.chunkCount} chunks</span>
          <Divider />
          <span>{source.kind.toLowerCase()}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <StatusBadge status={source.indexStatus} />
        <IconButton
          label="Reindex this source"
          onClick={onReindex}
          disabled={busy}
        >
          <RefreshIcon />
        </IconButton>
        <IconButton
          label="Delete this source"
          onClick={onDelete}
          disabled={busy}
          className="hover:text-err"
        >
          <TrashIcon />
        </IconButton>
      </div>
    </header>
  );
}
