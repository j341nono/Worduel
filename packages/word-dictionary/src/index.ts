import { THREE_LETTER_WORDS } from "./words.js";

const WORD_SET: ReadonlySet<string> = new Set(THREE_LETTER_WORDS);

export { THREE_LETTER_WORDS };

export function normalizeWord(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidWordShape(input: string): boolean {
  return /^[a-z]{3}$/.test(input);
}

export function isValidWord(input: string): boolean {
  const w = normalizeWord(input);
  return isValidWordShape(w) && WORD_SET.has(w);
}

/**
 * Sample `count` distinct random words from the dictionary.
 * Accepts an optional rng for deterministic tests.
 */
export function sampleWords(count: number, rng: () => number = Math.random): string[] {
  if (count <= 0) return [];
  const max = Math.min(count, THREE_LETTER_WORDS.length);
  const out: string[] = [];
  const seen = new Set<number>();
  while (out.length < max) {
    const idx = Math.floor(rng() * THREE_LETTER_WORDS.length);
    if (seen.has(idx)) continue;
    seen.add(idx);
    const w = THREE_LETTER_WORDS[idx];
    if (w) out.push(w);
  }
  return out;
}

export function dictionarySize(): number {
  return WORD_SET.size;
}
