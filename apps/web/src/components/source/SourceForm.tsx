"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useIngest } from "../../hooks/useSources";
import { Button } from "../ui/Button";
import { FIELD_CLASS } from "../ui/Field";
import { Tabs } from "../ui/Tabs";

type Tab = "note" | "link";

const TABS: { value: Tab; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "link", label: "Link" },
];

type Props = {
  onCreated: (id: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
};

export function SourceForm({ onCreated, onCancel, autoFocus = false }: Props) {
  const [tab, setTab] = useState<Tab>("note");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");

  const noteRef = useRef<HTMLTextAreaElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);

  const ingest = useIngest((source) => {
    setNote("");
    setLink("");
    onCreated(source.id);
  });

  useEffect(() => {
    if (mounted.current || autoFocus) {
      (tab === "note" ? noteRef : linkRef).current?.focus();
    }
    mounted.current = true;
  }, [autoFocus, tab]);

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

  const onNoteKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;

    event.preventDefault();
    submit();
  };

  const onLinkKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    submit();
  };

  return (
    <div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Source kind" />

      {tab === "note" ? (
        <textarea
          ref={noteRef}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={onNoteKeyDown}
          placeholder="Paste or write anything worth keeping…"
          className={`${FIELD_CLASS} min-h-[86px] resize-none`}
        />
      ) : (
        <input
          ref={linkRef}
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={onLinkKeyDown}
          placeholder="https://"
          className={FIELD_CLASS}
        />
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <Button variant="primary" onClick={submit} disabled={disabled}>
          {ingest.isPending ? "Saving…" : "Save"}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
