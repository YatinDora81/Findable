export function StartPane({ loading }: { loading: boolean }) {
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
          {loading ? "Opening your inbox" : "Nothing saved yet"}
        </h3>
        <p className="mt-2.5 text-[13.5px] leading-[1.66] tracking-[-0.006em] text-ink-3">
          {loading
            ? "One moment while we load what you have saved."
            : "Save a note or a link from the panel on the left. Once it is indexed you can ask it anything, and every claim links back to the passage it came from."}
        </p>
      </div>
    </div>
  );
}
