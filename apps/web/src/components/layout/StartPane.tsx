import { SourceForm } from "../source/SourceForm";

type Props = { loading: boolean; onCreated?: (id: string) => void };

export function StartPane({ loading, onCreated }: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="grid min-h-full place-items-center p-6 md:p-10">
        <div className="w-full max-w-[440px]">
          <div className="text-center">
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
                : "Start with a note or a link. Once it is indexed you can ask it anything, and every claim links back to the passage it came from."}
            </p>
          </div>

          {!loading && onCreated && (
            <div className="mt-[22px] rounded-xl border border-rule-2 bg-paper-2 p-3.5">
              <SourceForm onCreated={onCreated} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
