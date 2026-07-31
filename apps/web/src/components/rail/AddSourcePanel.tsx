"use client";

import { useEffect, useRef, useState } from "react";
import { useIngest } from "../../hooks/useSources";
import { PlusIcon } from "../icons";
import { Button } from "../ui/Button";
import { FIELD_CLASS } from "../ui/Field";
import { Tabs } from "../ui/Tabs";

type Tab = "note" | "link";

const TABS: { value: Tab; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "link", label: "Link" },
];

type Props = { onCreated: (id: string) => void };

export function AddSourcePanel({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("note");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");

  const noteRef = useRef<HTMLTextAreaElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  const ingest = useIngest((source) => {
    setNote("");
    setLink("");
    setOpen(false);
    onCreated(source.id);
  });

  useEffect(() => {
    if (!open) return;
    if (tab === "note") noteRef.current?.focus();
    else linkRef.current?.focus();
  }, [open, tab]);

  const value = tab === "note" ? note : link;
  const disabled = ingest.isPending || value.trim().length === 0;

  const submit = () => {
    if (disabled) return;
    ingest.mutate(
      tab === "note"
        ? { type: "text", content: note.trim() }
        : { type: "link", url: link.trim() },
    );
  };

  const cancel = () => {
    setNote("");
    setLink("");
    setOpen(false);
  };

  return (
    <div className="border-b border-rule p-[14px_16px]">
      {open ? (
        <div className="animate-drop">
          <Tabs tabs={TABS} value={tab} onChange={setTab} label="Source kind" />

          {tab === "note" ? (
            <textarea
              ref={noteRef}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Paste or write anything worth keeping…"
              className={`${FIELD_CLASS} min-h-[86px] resize-none`}
            />
          ) : (
            <input
              ref={linkRef}
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://"
              className={FIELD_CLASS}
            />
          )}

          <div className="mt-2.5 flex items-center gap-2">
            <Button variant="primary" onClick={submit} disabled={disabled}>
              Save
            </Button>
            <Button variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          </div>
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
