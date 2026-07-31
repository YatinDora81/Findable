const DELAYS = ["0s", "0.16s", "0.32s"];

export function ProcessingPane() {
  return (
    <div className="grid flex-1 place-items-center p-10">
      <div className="max-w-[420px] text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="flex items-center gap-[5px]">
            {DELAYS.map((delay) => (
              <span
                key={delay}
                aria-hidden="true"
                style={{ animationDelay: delay }}
                className="size-[5px] rounded-full bg-ink-3 animate-bob"
              />
            ))}
          </span>
          <span className="text-[13px] text-ink-3">
            Fetching and indexing&hellip;
          </span>
        </div>
        <p className="mt-3.5 text-[13.5px] leading-[1.66] text-ink-3">
          Reading the page, splitting it into passages, generating embeddings.
          Usually under ten seconds.
        </p>
      </div>
    </div>
  );
}
