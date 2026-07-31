"use client";

import { useEffect, useState } from "react";
import { AuthModal } from "../auth/AuthModal";
import { MenuIcon } from "../icons";
import { AccountChip } from "../rail/AccountChip";
import { AddSourcePanel } from "../rail/AddSourcePanel";
import { BrandHeader } from "../rail/BrandHeader";
import { SourceList } from "../rail/SourceList";
import { IconButton } from "../ui/IconButton";
import type { Source } from "../../lib/types";

type Props = {
  sources: Source[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onRetry: (id: string) => void;
  children: React.ReactNode;
};

export function AppShell({
  sources,
  activeId,
  loading,
  onSelect,
  onRetry,
  children,
}: Props) {
  const [railOpen, setRailOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    setRailOpen(false);
  }, [activeId]);

  return (
    <div className="grid h-screen md:grid-cols-[314px_1fr]">
      {railOpen && (
        <button
          type="button"
          aria-label="Close the source list"
          onClick={() => setRailOpen(false)}
          className="fixed inset-0 z-[450] bg-black/30 md:hidden"
        />
      )}

      <aside
        className={`flex min-h-0 flex-col border-r border-rule bg-paper max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[500] max-md:w-[300px] max-md:transition-transform max-md:duration-200 ${
          railOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        }`}
      >
        <BrandHeader />
        <AddSourcePanel onCreated={onSelect} />
        <SourceList
          sources={sources}
          activeId={activeId}
          loading={loading}
          onSelect={onSelect}
          onRetry={onRetry}
        />
        <AccountChip onOpenAuth={() => setAuthOpen(true)} />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-col">
        <div className="flex items-center gap-2 border-b border-rule px-[22px] py-2.5 md:hidden">
          <IconButton label="Open the source list" onClick={() => setRailOpen(true)}>
            <MenuIcon />
          </IconButton>
          <span className="font-display text-[15px] font-bold tracking-[-0.03em]">
            Find<span className="text-accent">able</span>
          </span>
        </div>
        {children}
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
