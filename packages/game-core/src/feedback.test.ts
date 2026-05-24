import { describe, expect, it } from "vitest";
import { computeFeedback, isAllCorrect } from "./feedback.js";

describe("computeFeedback", () => {
  it("marks an exact match all correct", () => {
    const fb = computeFeedback("cat", "cat");
    expect(fb.map((f) => f.feedback)).toEqual(["correct", "correct", "correct"]);
    expect(isAllCorrect(fb)).toBe(true);
  });

  it("marks completely wrong guess as all absent", () => {
    const fb = computeFeedback("dog", "cat");
    expect(fb.map((f) => f.feedback)).toEqual(["absent", "absent", "absent"]);
  });

  it("handles present letters in wrong position", () => {
    const fb = computeFeedback("act", "cat");
    expect(fb.map((f) => f.feedback)).toEqual(["present", "present", "correct"]);
  });

  it("handles duplicate letters in guess against single-occurrence answer", () => {
    // answer: "bat", guess: "tat" -> first 't' absent (already used in pos 2), 'a' correct, 't' correct
    const fb = computeFeedback("tat", "bat");
    expect(fb.map((f) => f.feedback)).toEqual(["absent", "correct", "correct"]);
  });

  it("handles duplicates correctly in both", () => {
    const fb = computeFeedback("eel", "ell");
    // pos0: e vs e -> correct; pos1: e vs l -> 'e' has 0 left ('e' consumed at pos0) -> absent
    // pos2: l vs l -> correct
    expect(fb.map((f) => f.feedback)).toEqual(["correct", "absent", "correct"]);
  });

  it("throws on wrong length", () => {
    expect(() => computeFeedback("ab", "cat")).toThrow();
    expect(() => computeFeedback("cat", "ca")).toThrow();
  });
});
