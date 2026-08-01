"use client";

import { useState } from "react";
import { PlusIcon } from "../icons";
import { SourceForm } from "../source/SourceForm";

type Props = { onCreated: (id: string) => void };

export function AddSourcePanel({ onCreated }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-rule p-[14px_16px]">
      {open ? (
        <div className="animate-drop">
          <SourceForm
            autoFocus
            onCreated={(id) => {
              setOpen(false);
              onCreated(id);
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-rule-2 bg-paper-2 px-3 py-[9px] text-[13px] font-medium tracking-[-0.005em] text-ink-2 transition-[background-color,border-color,color] duration-[180ms] hover:border-accent hover:bg-paper hover:text-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg"
        >
          <PlusIcon />
          Save a note or link
        </button>
      )}
    </div>
  );
}
