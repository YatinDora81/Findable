type Props = { chunkCount: number };

export function EmptyPane({ chunkCount }: Props) {
  return (
    <div className="grid flex-1 place-items-center p-10">
      <div className="max-w-[420px] text-center">
        <div
          aria-hidden="true"
          className="mb-[18px] font-display text-[52px] font-bold leading-none text-rule-2"
        >
          ¶
        </div>
        <h3 className="font-display text-[21px] font-semibold tracking-[-0.028em] text-ink">
          Indexed and ready
        </h3>
        <p className="mt-2.5 text-[13.5px] leading-[1.66] text-ink-3">
          Ask anything about this source. Every claim links back to the exact
          passage it came from.
        </p>
        <p className="mt-3.5 font-mono text-[10.5px] text-ink-3">
          {chunkCount} passages indexed
        </p>
      </div>
    </div>
  );
}
