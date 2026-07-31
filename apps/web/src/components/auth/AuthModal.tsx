"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useGuestSession, useLogin } from "../../hooks/useAccount";
import { CloseIcon, UserIcon } from "../icons";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { IconButton } from "../ui/IconButton";

type Mode = "signin" | "signup";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const restoreRef = useRef<HTMLElement | null>(null);

  const guest = useGuestSession();
  const login = useLogin();
  const pending = guest.isPending || login.isPending;
  const isSignup = mode === "signup";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    restoreRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    return () => {
      restoreRef.current?.focus();
      restoreRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !mounted) return;

    const target = document.getElementById(
      isSignup ? "auth-name" : "auth-email",
    );

    if (target instanceof HTMLInputElement) target.focus();
  }, [open, mounted, isSignup]);

  if (!open || !mounted) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    if (isSignup) {
      guest.mutate(undefined, { onSuccess: () => onClose() });
      return;
    }

    login.mutate({ email, password }, { onSuccess: () => onClose() });
  };

  const primaryLabel = pending
    ? isSignup
      ? "Creating…"
      : "Signing in…"
    : isSignup
      ? "Create account"
      : "Sign in";

  return createPortal(
    <div
      className="fixed inset-0 z-[600] grid place-items-center bg-black/40 p-6 backdrop-blur-[7px] animate-fade"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative w-full max-w-[396px] rounded-2xl bg-paper p-[30px_30px_26px] shadow-[0_18px_48px_-12px_rgba(0,0,0,0.25)] ring-1 ring-rule animate-pop"
      >
        <IconButton
          label="Close"
          onClick={onClose}
          className="absolute right-4 top-4"
        >
          <CloseIcon />
        </IconButton>

        <div className="mb-[17px] grid size-[34px] place-items-center rounded-[10px] bg-accent font-display text-[17px] font-bold tracking-[-0.04em] text-paper">
          F
        </div>

        <h2
          id="auth-title"
          className="font-display text-[22px] font-semibold tracking-[-0.03em] text-ink"
        >
          {isSignup ? "Create your inbox" : "Welcome back"}
        </h2>

        <p className="mb-[22px] mt-[7px] text-[13px] leading-[1.6] tracking-[-0.006em] text-ink-3">
          {isSignup
            ? "Save anything, then ask it questions. Answers cite what you saved."
            : "Sign in to reach everything you've saved."}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <Field
              id="auth-name"
              label="Name"
              placeholder="Ada Lovelace"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}

          <Field
            id="auth-email"
            label="Email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <Field
            id="auth-password"
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            suffix={
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
                className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3 transition-[color] duration-[160ms] hover:text-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            }
          />

          <Button
            variant="primary"
            type="submit"
            disabled={pending}
            className="mt-1.5 w-full py-[11px]"
          >
            {primaryLabel}
          </Button>
        </form>

        {isSignup && (
          <p className="mt-[13px] text-center text-[11px] leading-[1.55] text-ink-3">
            By continuing you agree to our{" "}
            <a
              href="/terms"
              className="text-ink-2 underline underline-offset-2"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="text-ink-2 underline underline-offset-2"
            >
              Privacy Policy
            </a>
            .
          </p>
        )}

        <Button
          variant="outline"
          disabled={pending}
          onClick={() => guest.mutate(undefined, { onSuccess: () => onClose() })}
          className="mt-2.5 w-full py-2.5"
        >
          <UserIcon />
          Continue as guest
        </Button>

        <p className="mt-2 text-center text-[10.5px] leading-[1.5] text-ink-3">
          Try it with no account. You get a password back so you can sign in
          again later.
        </p>

        <p className="mt-[18px] border-t border-rule pt-4 text-center text-[12.5px] text-ink-3">
          {isSignup ? "Already have an inbox? " : "No inbox yet? "}
          <button
            type="button"
            onClick={() => setMode(isSignup ? "signin" : "signup")}
            className="font-medium text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-bg"
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
}
