"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function IconButton({ label, className = "", ...props }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-[30px] shrink-0 place-items-center rounded-[7px] text-ink-3 transition-[background-color,color] duration-[160ms] hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg ${className}`}
      {...props}
    />
  );
}
