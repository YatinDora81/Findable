"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "outline";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-[#FFF9F5] hover:bg-accent-2 disabled:opacity-40 disabled:hover:bg-accent",
  ghost: "text-ink-3 hover:text-ink",
  outline:
    "border border-rule-2 text-ink-2 hover:bg-paper-2 hover:border-ink-3 hover:text-ink",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[7px] px-[15px] py-2 text-[12.5px] font-medium tracking-[-0.005em] transition-[background-color,border-color,color,opacity] duration-[180ms] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg disabled:cursor-default ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
