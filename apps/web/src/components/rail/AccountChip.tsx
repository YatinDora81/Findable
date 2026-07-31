"use client";

import { useAccount, useLogout } from "../../hooks/useAccount";
import { initials } from "../../lib/format";
import { SignInIcon } from "../icons";
import { IconButton } from "../ui/IconButton";

type Props = { onOpenAuth: () => void };

export function AccountChip({ onOpenAuth }: Props) {
  const { data: account } = useAccount();
  const logout = useLogout();

  const isGuest = Boolean(account?.isGuest);
  const signedIn = Boolean(account) && !isGuest;

  const name = signedIn
    ? (account?.name ?? account?.email ?? "Account")
    : isGuest
      ? "Guest"
      : "Not signed in";

  const detail = signedIn
    ? (account?.email ?? "")
    : isGuest
      ? "local session"
      : "sign in to sync";

  return (
    <div className="flex items-center gap-2.5 border-t border-rule p-[11px_14px]">
      <span
        aria-hidden="true"
        className={`grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-semibold ${
          signedIn ? "bg-accent-bg text-accent" : "bg-paper-3 text-ink-3"
        }`}
      >
        {signedIn ? initials(account?.name ?? account?.email ?? "") : "G"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium tracking-[-0.008em] text-ink">
          {name}
        </p>
        <p className="truncate font-mono text-[10px] text-ink-3">{detail}</p>
      </div>

      {signedIn ? (
        <IconButton
          label="Sign out"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <SignInIcon />
        </IconButton>
      ) : (
        <IconButton label="Sign in" onClick={onOpenAuth}>
          <SignInIcon />
        </IconButton>
      )}
    </div>
  );
}
