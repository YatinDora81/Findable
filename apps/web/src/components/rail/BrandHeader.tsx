"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "../icons";
import { IconButton } from "../ui/IconButton";

export function BrandHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-start justify-between gap-3 border-b border-rule p-[20px_20px_17px]">
      <div className="min-w-0">
        <h1 className="whitespace-nowrap font-display text-[20px] font-bold leading-[1.05] tracking-[-0.035em]">
          <span className="text-ink">Find</span>
          <span className="text-accent">able</span>
        </h1>
        <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.11em] text-ink-3">
          Save · Ask · Verify
        </p>
      </div>

      {mounted ? (
        <IconButton
          label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </IconButton>
      ) : (
        <span aria-hidden="true" className="block size-[30px] shrink-0" />
      )}
    </div>
  );
}
