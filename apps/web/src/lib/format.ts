export const stripScheme = (value: string): string =>
  value.replace(/^https?:\/\//, "");

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 45) return "now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h`;
  if (seconds < 604_800) return `${Math.round(seconds / 86_400)}d`;

  return `${Math.round(seconds / 604_800)}w`;
}

export const initials = (value: string): string =>
  value.trim().charAt(0).toUpperCase() || "G";
