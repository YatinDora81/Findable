"use client";

type Props = {
  n: number;
  lit: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
};

export function CitationMarker({ n, lit, onEnter, onLeave, onClick }: Props) {
  return (
    <button
      type="button"
      aria-label={`Jump to source ${n}`}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      onMouseLeave={onLeave}
      onBlur={onLeave}
      onClick={onClick}
      className={`mx-px inline-block rounded px-[4.5px] py-[2.5px] align-super font-mono text-[9px] font-medium leading-none transition-[background-color,color,transform] duration-150 hover:-translate-y-px hover:bg-accent hover:text-paper focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg ${
        lit ? "-translate-y-px bg-accent text-paper" : "bg-accent-bg text-accent"
      }`}
    >
      {n}
    </button>
  );
}
