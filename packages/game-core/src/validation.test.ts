import { describe, expect, it } from "vitest";
import { validateGuess } from "./validation.js";

describe("validateGuess", () => {
  it("accepts valid 3-letter dictionary word, lowercased", () => {
    const r = validateGuess("CAT");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.word).toBe("cat");
  });

  it("rejects wrong length", () => {
    const r = validateGuess("ca");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("shape");
  });

  it("rejects non-letter characters", () => {
    const r = validateGuess("c4t");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("shape");
  });

  it("rejects shape-valid but unknown words", () => {
    const r = validateGuess("xqz");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("dictionary");
  });
});
