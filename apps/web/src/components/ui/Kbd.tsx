export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-rule-2 bg-paper-3 px-[5px] py-[1.5px] font-mono text-[9.5px]">
      {children}
    </kbd>
  );
}
