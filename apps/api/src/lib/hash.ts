import { createHash } from "node:crypto";

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ref",
  "ref_src",
];

export const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export function canonicalizeUrl(raw: string): string {
  const url = new URL(raw);

  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.protocol = url.protocol.toLowerCase();

  for (const param of TRACKING_PARAMS) url.searchParams.delete(param);
  url.searchParams.sort();

  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

export const normalizeText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();
