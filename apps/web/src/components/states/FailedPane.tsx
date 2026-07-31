"use client";

import { Button } from "../ui/Button";

type Props = {
  code: string | null;
  message: string | null;
  onRetry: () => void;
  busy?: boolean;
};

export function FailedPane({ code, message, onRetry, busy = false }: Props) {
  return (
    <div className="grid flex-1 place-items-center p-10">
      <div className="max-w-[420px] text-center">
        <span className="mb-3.5 inline-block rounded-[5px] bg-err-bg px-[9px] py-1 font-mono text-[10.5px] text-err">
          {code ?? "UNKNOWN"}
        </span>
        <h3 className="font-display text-[21px] font-semibold tracking-[-0.028em] text-ink">
          {message ?? "That source could not be indexed"}
        </h3>
        <p className="mt-2.5 text-[13.5px] leading-[1.66] text-ink-3">
          The fetch succeeded but the extractor found no article body. Usually a
          paywall, a login wall, or a page that renders entirely in JavaScript.
        </p>
        <Button
          variant="primary"
          className="mt-[19px]"
          onClick={onRetry}
          disabled={busy}
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
