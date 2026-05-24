import { describe, expect, it } from "vitest";
import { computeTokenCount, msUntilNextToken } from "./tokens.js";

describe("computeTokenCount", () => {
  const start = 1_000_000;

  it("starts at 0 before the 5s initial offset", () => {
    expect(computeTokenCount({ matchStartMs: start, nowMs: start, tokensSpent: 0 })).toBe(0);
    expect(computeTokenCount({ matchStartMs: start, nowMs: start + 4_999, tokensSpent: 0 })).toBe(0);
  });

  it("earns first token at 5s", () => {
    expect(computeTokenCount({ matchStartMs: start, nowMs: start + 5_000, tokensSpent: 0 })).toBe(1);
  });

  it("earns subsequent tokens every 10s", () => {
    expect(computeTokenCount({ matchStartMs: start, nowMs: start + 15_000, tokensSpent: 0 })).toBe(2);
    expect(computeTokenCount({ matchStartMs: start, nowMs: start + 25_000, tokensSpent: 0 })).toBe(2); // capped storage
    expect(computeTokenCount({ matchStartMs: start, nowMs: start + 25_000, tokensSpent: 1 })).toBe(2);
  });

  it("caps lifetime earned at 5 (no more tokens after 45s)", () => {
    expect(computeTokenCount({ matchStartMs: start, nowMs: start + 45_000, tokensSpent: 4 })).toBe(1);
    expect(computeTokenCount({ matchStartMs: start, nowMs: start + 60_000, tokensSpent: 4 })).toBe(1);
    expect(computeTokenCount({ matchStartMs: start, nowMs: start + 60_000, tokensSpent: 5 })).toBe(0);
  });

  it("never returns negative", () => {
    expect(computeTokenCount({ matchStartMs: start, nowMs: start + 1_000, tokensSpent: 5 })).toBe(0);
  });
});

describe("msUntilNextToken", () => {
  const start = 1_000_000;

  it("counts down to the 5s first-token boundary", () => {
    expect(msUntilNextToken({ matchStartMs: start, nowMs: start + 1_000, tokensSpent: 0 })).toBe(4_000);
  });

  it("returns ms to next 10s boundary after first token", () => {
    expect(msUntilNextToken({ matchStartMs: start, nowMs: start + 7_000, tokensSpent: 0 })).toBe(8_000);
  });

  it("returns null once lifetime cap is reached", () => {
    expect(msUntilNextToken({ matchStartMs: start, nowMs: start + 50_000, tokensSpent: 0 })).toBeNull();
  });
});
