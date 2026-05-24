import { describe, expect, it } from "vitest";
import { isMatchOver, matchEndAt, matchRemainingMs } from "./timer.js";

describe("timer helpers", () => {
  const start = 10_000;

  it("matchEndAt is start + 60s", () => {
    expect(matchEndAt(start)).toBe(start + 60_000);
  });

  it("matchRemainingMs floors at 0", () => {
    expect(matchRemainingMs(start, start + 90_000)).toBe(0);
    expect(matchRemainingMs(start, start + 30_000)).toBe(30_000);
  });

  it("isMatchOver flips at end", () => {
    expect(isMatchOver(start, start + 59_999)).toBe(false);
    expect(isMatchOver(start, start + 60_000)).toBe(true);
  });
});
