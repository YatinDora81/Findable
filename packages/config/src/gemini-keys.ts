export type GeminiKey = {
  name: string;
  key: string;
};

const PAIR_SEPARATOR = "__SPLIT__";

function mask(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function parseGeminiKeys(raw: string): GeminiKey[] {
  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (entries.length === 0) {
    throw new Error(
      `GEMINI_API_KEYS is empty. Expected NAME${PAIR_SEPARATOR}KEY entries separated by commas.`,
    );
  }

  const keys: GeminiKey[] = [];
  const seenNames = new Set<string>();
  const seenKeys = new Set<string>();

  for (const [index, entry] of entries.entries()) {
    const at = entry.indexOf(PAIR_SEPARATOR);

    if (at === -1) {
      throw new Error(
        `GEMINI_API_KEYS entry ${index + 1} is missing the "${PAIR_SEPARATOR}" separator. Expected NAME${PAIR_SEPARATOR}KEY.`,
      );
    }

    const name = entry.slice(0, at).trim();
    const key = entry.slice(at + PAIR_SEPARATOR.length).trim();

    if (name.length === 0) {
      throw new Error(`GEMINI_API_KEYS entry ${index + 1} has an empty name.`);
    }

    if (key.length === 0) {
      throw new Error(`GEMINI_API_KEYS entry "${name}" has an empty key.`);
    }

    if (seenNames.has(name)) {
      throw new Error(`GEMINI_API_KEYS has a duplicate name "${name}".`);
    }

    if (seenKeys.has(key)) {
      throw new Error(
        `GEMINI_API_KEYS entry "${name}" repeats the key ${mask(key)} used by an earlier entry.`,
      );
    }

    seenNames.add(name);
    seenKeys.add(key);
    keys.push({ name, key });
  }

  return keys;
}

export function describeGeminiKeys(keys: GeminiKey[]): string {
  return keys.map((entry) => `${entry.name}(${mask(entry.key)})`).join(", ");
}
