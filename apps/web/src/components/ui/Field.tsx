"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

const FIELD_CLASS =
  "w-full rounded-lg border border-rule-2 bg-paper px-3 py-2.5 text-[13px] leading-[1.55] outline-none transition-[border-color,box-shadow] duration-[180ms] placeholder:text-ink-3 focus:border-accent focus:ring-[3px] focus:ring-accent-bg";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  suffix?: ReactNode;
  error?: string;
};

export function Field({
  label,
  suffix,
  error,
  className = "",
  id,
  ...props
}: Props) {
  const generated = useId();
  const fieldId = id ?? generated;

  return (
    <div className="mb-3">
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-1.5 block text-[11.5px] font-medium tracking-[-0.004em] text-ink-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={fieldId}
          className={`${FIELD_CLASS} ${suffix ? "pr-14" : ""} ${className}`}
          {...props}
        />
        {suffix && (
          <div className="absolute right-[11px] top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-[11.5px] text-err">{error}</p>}
    </div>
  );
}

export { FIELD_CLASS };
