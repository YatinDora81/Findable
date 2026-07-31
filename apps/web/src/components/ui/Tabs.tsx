"use client";

type Tab<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-2.5 flex gap-0.5 rounded-lg bg-paper-3 p-[2.5px]"
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={`flex-1 rounded-md py-1.5 text-[12px] font-medium tracking-[-0.003em] transition-[background-color,color] duration-[160ms] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg ${
              selected
                ? "bg-paper text-ink shadow-[0_1px_2px_rgba(23,21,15,0.05)]"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
