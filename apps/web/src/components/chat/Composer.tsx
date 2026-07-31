"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";

import { useAutoGrow } from "../../hooks/useAutoGrow";
import { ArrowUpIcon } from "../icons";
import { Kbd } from "../ui/Kbd";

type Props = {
  chunkCount: number;
  onSubmit: (question: string) => void;
  disabled?: boolean;
};

export function Composer({ chunkCount, onSubmit, disabled = false }: Props) {
  const [value, setValue] = useState("");
  const { ref, resize } = useAutoGrow();

  const blocked = disabled || value.trim().length === 0;

  const submit = () => {
    if (blocked) return;

    onSubmit(value.trim());
    setValue("");

    const el = ref.current;
    if (el) el.value = "";
    resize();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    submit();
  };

  return (
    <div className="border-t border-rule px-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3.5">
      <div className="mx-auto flex max-w-[648px] items-end gap-2.5 rounded-xl border border-rule-2 bg-paper-2 py-2 pl-[15px] pr-2 transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-bg">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder="Ask this source anything…"
          onChange={(event) => {
            setValue(event.target.value);
            resize();
          }}
          onKeyDown={onKeyDown}
          className="max-h-[130px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-[1.55] tracking-[-0.01em] outline-none placeholder:text-ink-3"
        />

        <button
          type="button"
          aria-label="Send"
          disabled={blocked}
          onClick={submit}
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-paper transition-[background-color,opacity] duration-[180ms] hover:bg-accent-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg disabled:cursor-default disabled:opacity-25"
        >
          <ArrowUpIcon />
        </button>
      </div>

      <div className="mx-auto mt-2 flex max-w-[648px] justify-between font-mono text-[10px] text-ink-3">
        <span>Searching {chunkCount} passages.</span>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> send
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>⇧↵</Kbd> newline
          </span>
        </span>
      </div>
    </div>
  );
}
