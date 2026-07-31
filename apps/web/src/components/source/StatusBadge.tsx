import type { IndexStatus } from "../../lib/types";

const STATUS = {
  PENDING: { label: "Queued", dot: "bg-rule-2", chip: "bg-paper-2 text-ink-3" },
  PROCESSING: {
    label: "Indexing",
    dot: "bg-warn animate-pulse-slow",
    chip: "bg-warn-bg text-warn",
  },
  READY: { label: "Indexed", dot: "bg-ok", chip: "bg-ok-bg text-ok" },
  FAILED: { label: "Failed", dot: "bg-err", chip: "bg-err-bg text-err" },
} as const;

export function statusLabel(status: IndexStatus): string {
  return STATUS[status].label;
}

export function StatusDot({ status }: { status: IndexStatus }) {
  return (
    <span
      aria-hidden="true"
      className={`size-[5px] shrink-0 rounded-full ${STATUS[status].dot}`}
    />
  );
}

export function StatusBadge({ status }: { status: IndexStatus }) {
  const meta = STATUS[status];

  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-full px-[11px] py-[5px] text-[11px] font-medium ${meta.chip}`}
    >
      <StatusDot status={status} />
      {meta.label}
    </span>
  );
}

export { STATUS };
