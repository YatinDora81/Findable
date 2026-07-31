import dns from "node:dns/promises";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import ipaddr from "ipaddr.js";
import TurndownService from "turndown";
import { env } from "@repo/config";
import { AppError } from "@repo/contracts";

const BLOCKED_RANGES = [
  "private",
  "loopback",
  "linkLocal",
  "uniqueLocal",
  "reserved",
  "unspecified",
  "broadcast",
  "carrierGradeNat",
];

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

turndown.remove(["script", "style", "noscript"]);

export type ExtractedDocument = {
  title: string;
  markdown: string;
  meta: Record<string, unknown>;
};

export async function extractFromUrl(url: string): Promise<ExtractedDocument> {
  const parsed = new URL(url);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError("BLOCKED_HOST", "Only http and https urls are supported");
  }

  await assertPublicHost(parsed.hostname);

  const response = await fetchWithTimeout(url);

  if (response.status === 404) throw new AppError("NOT_FOUND", "Page not found");
  if (response.status === 403)
    throw new AppError("FORBIDDEN", "The site blocked the fetch");
  if (response.status === 429)
    throw new AppError("RATE_LIMITED", "The site rate limited the fetch");
  if (!response.ok)
    throw new AppError("UPSTREAM_ERROR", `The site returned ${response.status}`);

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html")) {
    throw new AppError(
      "UNSUPPORTED_TYPE",
      `Cannot read ${contentType.split(";")[0] || "this content type"} yet`,
    );
  }

  const finalUrl = response.url || url;

  if (finalUrl !== url) {
    await assertPublicHost(new URL(finalUrl).hostname);
  }

  const html = await readCapped(response, env.MAX_CONTENT_BYTES);
  const dom = new JSDOM(html, { url: finalUrl });
  const article = new Readability(dom.window.document).parse();

  if (!article?.content) {
    throw new AppError(
      "EXTRACTION_EMPTY",
      "Nothing readable found, the page may be paywalled",
    );
  }

  const markdown = turndown.turndown(article.content).trim();

  if (markdown.length === 0) {
    throw new AppError("EXTRACTION_EMPTY", "Nothing readable found on that page");
  }

  return {
    title: article.title?.trim() || parsed.hostname,
    markdown,
    meta: {
      siteName: article.siteName,
      byline: article.byline,
      excerpt: article.excerpt,
      httpStatus: response.status,
      finalUrl,
      fetchedAt: new Date().toISOString(),
    },
  };
}

async function assertPublicHost(hostname: string): Promise<void> {
  const literal = parseIp(hostname);

  if (literal) {
    if (isBlocked(literal)) {
      throw new AppError("BLOCKED_HOST", "That address is not reachable");
    }
    return;
  }

  const resolved = await dns.lookup(hostname, { all: true }).catch(() => []);

  if (resolved.length === 0) {
    throw new AppError("BLOCKED_HOST", "That host could not be resolved");
  }

  for (const entry of resolved) {
    const address = parseIp(entry.address);
    if (!address || isBlocked(address)) {
      throw new AppError("BLOCKED_HOST", "That address is not reachable");
    }
  }
}

function parseIp(value: string): ipaddr.IPv4 | ipaddr.IPv6 | null {
  const candidate = value.startsWith("[") ? value.slice(1, -1) : value;
  return ipaddr.isValid(candidate) ? ipaddr.parse(candidate) : null;
}

function isBlocked(address: ipaddr.IPv4 | ipaddr.IPv6): boolean {
  if (address.kind() === "ipv6") {
    const v6 = address as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) return isBlocked(v6.toIPv4Address());
  }

  return BLOCKED_RANGES.includes(address.range());
}

async function fetchWithTimeout(url: string): Promise<Response> {
  try {
    return await fetch(url, {
      signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: {
        "User-Agent": "FindableBot/1.0 (+https://findable.local/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AppError("UPSTREAM_TIMEOUT", "The site took too long to respond");
    }
    throw new AppError("UPSTREAM_ERROR", "Could not reach that site");
  }
}

async function readCapped(response: Response, max: number): Promise<string> {
  if (!response.body) {
    throw new AppError("EXTRACTION_EMPTY", "The site returned an empty response");
  }

  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    size += value.length;

    if (size > max) {
      await reader.cancel();
      throw new AppError("CONTENT_TOO_LARGE", "That page is too large to index");
    }

    parts.push(value);
  }

  const merged = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return new TextDecoder().decode(merged);
}
