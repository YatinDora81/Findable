"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useGuestSession } from "../../hooks/useAccount";
import { useAsk, useMessages } from "../../hooks/useMessages";
import {
  useDeleteSource,
  useReindex,
  useSource,
  useSources,
} from "../../hooks/useSources";
import { Composer } from "../chat/Composer";
import { Thread } from "../chat/Thread";
import { DocumentHeader } from "../source/DocumentHeader";
import { EmptyPane } from "../states/EmptyPane";
import { FailedPane } from "../states/FailedPane";
import { ProcessingPane } from "../states/ProcessingPane";
import { AppShell } from "./AppShell";
import { StartPane } from "./StartPane";

export function Workspace() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: account, isLoading: accountLoading } = useAccount();
  const guest = useGuestSession();

  const signedIn = Boolean(account);
  const needsGuest = !accountLoading && !account && guest.isIdle;
  const startGuest = guest.mutate;

  useEffect(() => {
    if (needsGuest) startGuest();
  }, [needsGuest, startGuest]);

  const sources = useSources(signedIn);
  const list = signedIn ? (sources.data ?? []) : [];

  const accountId = account?.id ?? null;
  const seenAccount = useRef(accountId);

  if (seenAccount.current !== accountId) {
    seenAccount.current = accountId;
    if (activeId !== null) setActiveId(null);
  }

  useEffect(() => {
    if (activeId && list.some((source) => source.id === activeId)) return;
    setActiveId(list[0]?.id ?? null);
  }, [list, activeId]);

  const reindex = useReindex();
  const remove = useDeleteSource(() => setActiveId(null));

  return (
    <AppShell
      sources={list}
      activeId={activeId}
      loading={sources.isLoading || accountLoading}
      onSelect={setActiveId}
      onRetry={(id) => reindex.mutate(id)}
    >
      {activeId ? (
        <SourcePane
          key={activeId}
          sourceId={activeId}
          onReindex={() => reindex.mutate(activeId)}
          onDelete={() => remove.mutate(activeId)}
          busy={reindex.isPending || remove.isPending}
        />
      ) : (
        <StartPane
          loading={sources.isLoading || accountLoading}
          onCreated={setActiveId}
        />
      )}
    </AppShell>
  );
}

function SourcePane({
  sourceId,
  onReindex,
  onDelete,
  busy,
}: {
  sourceId: string;
  onReindex: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { data: source } = useSource(sourceId);
  const ready = source?.indexStatus === "READY";
  const { data: messages } = useMessages(sourceId, ready);
  const ask = useAsk(sourceId);

  if (!source) return <StartPane loading />;

  return (
    <>
      <DocumentHeader
        source={source}
        onReindex={onReindex}
        onDelete={onDelete}
        busy={busy}
      />

      {source.indexStatus === "FAILED" ? (
        <FailedPane
          code={source.errorCode}
          message={source.errorMessage}
          onRetry={onReindex}
          busy={busy}
        />
      ) : !ready ? (
        <ProcessingPane />
      ) : (
        <>
          <Thread
            messages={messages ?? []}
            pending={ask.isPending}
            chunkCount={source.chunkCount}
            emptyState={<EmptyPane chunkCount={source.chunkCount} />}
          />
          <Composer
            chunkCount={source.chunkCount}
            onSubmit={(question) => ask.mutate(question)}
            disabled={ask.isPending}
          />
        </>
      )}
    </>
  );
}
