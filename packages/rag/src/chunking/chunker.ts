import { encodingForModel } from "js-tiktoken";

const enc = encodingForModel("gpt-4o");

export const tok = (text: string): number => enc.encode(text).length;

export type Unit = {
  text: string;
  offset: number;
  tokens: number;
};

export type Chunk = {
  text: string;
  headingPath: string | null;
  tokens: number;
  start: number;
  end: number;
};

export type ChunkConfig = {
  target: number;
  max: number;
  min: number;
  overlap: number;
};

export const CHUNK_CONFIG: ChunkConfig = {
  target: 450,
  max: 700,
  min: 80,
  overlap: 60,
};

type Section = {
  text: string;
  offset: number;
  headingPath: string | null;
};

export function chunk(markdown: string, cfg: ChunkConfig = CHUNK_CONFIG): Chunk[] {
  const out: Chunk[] = [];

  for (const section of splitByHeadings(markdown)) {
    const units = toUnits(section.text, section.offset, cfg.max);

    let buf: Unit[] = [];
    let tokens = 0;

    for (const unit of units) {
      if (tokens + unit.tokens > cfg.target && buf.length > 0) {
        out.push(makeChunk(buf, section.headingPath));
        buf = tail(buf, cfg.overlap);
        tokens = sum(buf.map((held) => held.tokens));
      }
      buf.push(unit);
      tokens += unit.tokens;
    }

    if (buf.length > 0) out.push(makeChunk(buf, section.headingPath));
  }

  return mergeRunts(out, cfg.min);
}

function splitByHeadings(markdown: string): Section[] {
  const sections: Section[] = [];
  const stack: string[] = [];

  let cursor = 0;
  let buf = "";
  let start = 0;
  let fence: string | null = null;

  for (const line of markdown.split("\n")) {
    const fenceMark = line.match(/^\s{0,3}(`{3,}|~{3,})/);

    if (fenceMark) {
      const mark = fenceMark[1] ?? "";
      if (fence === null) fence = mark[0] ?? null;
      else if (mark[0] === fence) fence = null;
    }

    const heading = fence === null ? line.match(/^(#{1,4})\s+(.*)/) : null;

    if (heading) {
      const hashes = heading[1] ?? "";
      const title = (heading[2] ?? "").trim();

      if (buf.trim().length > 0) {
        sections.push({ text: buf, offset: start, headingPath: pathOf(stack) });
      }

      stack.length = Math.min(stack.length, hashes.length - 1);
      stack.push(title);
      buf = "";
      start = cursor + line.length + 1;
    } else {
      buf += `${line}\n`;
    }

    cursor += line.length + 1;
  }

  if (buf.trim().length > 0) {
    sections.push({ text: buf, offset: start, headingPath: pathOf(stack) });
  }

  return sections.length > 0
    ? sections
    : [{ text: markdown, offset: 0, headingPath: null }];
}

const pathOf = (stack: string[]): string | null =>
  stack.length > 0 ? stack.join(" > ") : null;

function toUnits(text: string, base: number, max: number): Unit[] {
  const units: Unit[] = [];
  let offset = base;

  for (const paragraph of text.split(/\n{2,}/)) {
    const trimmed = paragraph.trim();
    if (trimmed.length > 0) units.push(...explode(trimmed, offset, max));
    offset += paragraph.length + 2;
  }

  return units;
}

function explode(text: string, offset: number, max: number): Unit[] {
  const tokens = tok(text);
  if (tokens <= max) return [{ text, offset, tokens }];

  const parts = /[.!?。！？；]/.test(text)
    ? splitSentences(text)
    : hardSplit(text, max);

  if (parts.length === 1) {
    let cursor = offset;
    return hardSplit(text, max).map((part) => {
      const unit = { text: part, offset: cursor, tokens: tok(part) };
      cursor += part.length;
      return unit;
    });
  }

  let cursor = offset;
  return parts.flatMap((part) => {
    const units = explode(part.trim(), cursor, max);
    cursor += part.length + 1;
    return units;
  });
}

const splitSentences = (text: string): string[] =>
  text.split(/(?<=[.!?。！？；])\s*/).filter((part) => part.length > 0);

function hardSplit(text: string, maxTokens: number): string[] {
  const out: string[] = [];
  let rest = text;

  while (rest.length > 0) {
    if (tok(rest) <= maxTokens) {
      out.push(rest);
      break;
    }

    let size = Math.max(1, Math.floor((rest.length * maxTokens) / tok(rest)));

    while (size > 1 && tok(rest.slice(0, size)) > maxTokens) {
      size = Math.floor(size * 0.8);
    }

    out.push(rest.slice(0, size));
    rest = rest.slice(size);
  }

  return out.length > 0 ? out : [text];
}

function tail(buf: Unit[], overlap: number): Unit[] {
  const last = buf[buf.length - 1];
  if (!last) return [];
  if (last.tokens <= overlap) return [last];

  const sentences = splitSentences(last.text);
  const kept: Unit[] = [];
  let total = 0;

  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i];
    if (!sentence) continue;

    const tokens = tok(sentence);
    if (total + tokens > overlap) break;

    kept.unshift({ text: sentence, offset: last.offset, tokens });
    total += tokens;
  }

  return kept;
}

function makeChunk(units: Unit[], headingPath: string | null): Chunk {
  const first = units[0];
  const last = units[units.length - 1];

  if (!first || !last) {
    return { text: "", headingPath, tokens: 0, start: 0, end: 0 };
  }

  return {
    text: units.map((unit) => unit.text).join("\n\n"),
    headingPath,
    tokens: sum(units.map((unit) => unit.tokens)),
    start: first.offset,
    end: last.offset + last.text.length,
  };
}

function mergeRunts(chunks: Chunk[], min: number): Chunk[] {
  const out: Chunk[] = [];

  for (const current of chunks) {
    const previous = out[out.length - 1];

    if (
      current.tokens < min &&
      previous &&
      previous.headingPath === current.headingPath
    ) {
      previous.text += `\n\n${current.text}`;
      previous.tokens += current.tokens;
      previous.end = current.end;
    } else {
      out.push({ ...current });
    }
  }

  return out;
}

const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0);

const UNSPACED_SCRIPTS =
  /[぀-ヿ㐀-䶿一-鿿豈-﫿฀-๿가-힯]/g;

export function looksLikeProse(text: string): boolean {
  const sample = text.slice(0, 2000);
  if (sample.length === 0) return false;

  const letters = (sample.match(/\p{L}/gu) ?? []).length;
  if (letters / sample.length < 0.5) return false;

  const unspaced = (sample.match(UNSPACED_SCRIPTS) ?? []).length;

  if (unspaced / sample.length > 0.2) {
    return (sample.match(/[。！？、，．]/g) ?? []).length >= 3 || unspaced > 200;
  }

  const sentenceEnds = (sample.match(/[.!?]\s/g) ?? []).length;
  const spaceRatio = (sample.match(/\s/g) ?? []).length / sample.length;

  return sentenceEnds >= 3 && spaceRatio > 0.08;
}
