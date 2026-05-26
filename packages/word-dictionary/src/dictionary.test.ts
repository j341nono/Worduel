import { describe, expect, it } from "vitest";
import {
  THREE_LETTER_WORDS,
  dictionarySize,
  isValidWord,
  isValidWordShape,
  normalizeWord,
  sampleWords,
} from "./index.js";

describe("word dictionary", () => {
  it("contains at least 1000 words", () => {
    expect(dictionarySize()).toBeGreaterThanOrEqual(1000);
  });

  it("contains only 3-letter lowercase alpha words and no duplicates", () => {
    const set = new Set<string>();
    for (const w of THREE_LETTER_WORDS) {
      expect(w).toMatch(/^[a-z]{3}$/);
      expect(set.has(w)).toBe(false);
      set.add(w);
    }
  });

  it("normalizes input", () => {
    expect(normalizeWord("  CaT ")).toBe("cat");
  });

  it("validates shape", () => {
    expect(isValidWordShape("cat")).toBe(true);
    expect(isValidWordShape("CAT")).toBe(false);
    expect(isValidWordShape("ca")).toBe(false);
    expect(isValidWordShape("c4t")).toBe(false);
  });

  it("validates membership", () => {
    expect(isValidWord("cat")).toBe(true);
    expect(isValidWord("CAT")).toBe(true);
    expect(isValidWord("xyz")).toBe(false);
  });

  it("samples distinct words deterministically with a seeded rng", () => {
    let i = 0;
    const rng = () => (i++ % THREE_LETTER_WORDS.length) / THREE_LETTER_WORDS.length;
    const picks = sampleWords(3, rng);
    expect(picks).toHaveLength(3);
    expect(new Set(picks).size).toBe(3);
  });
});
