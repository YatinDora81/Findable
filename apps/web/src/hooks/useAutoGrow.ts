"use client";

import { useCallback, useRef } from "react";

export function useAutoGrow(max = 130) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [max]);

  return { ref, resize };
}
