type Props = { chunkCount: number };

const DELAYS = ["0s", "0.16s", "0.32s"];

export function Thinking({ chunkCount }: Props) {
  return (
    <div className="flex items-center gap-[9px] text-[13px] text-ink-3">
      <span className="flex items-center gap-[3px]">
        {DELAYS.map((delay) => (
          <span
            key={delay}
            className="animate-bob size-[5px] rounded-full bg-ink-3"
            style={{ animationDelay: delay }}
          />
        ))}
      </span>
      <span>Searching {chunkCount} passages…</span>
    </div>
  );
}
