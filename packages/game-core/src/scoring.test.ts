import { describe, expect, it } from "vitest";
import { scoreMatchEndExpire, scoreSolve } from "./scoring.js";

describe("scoreSolve", () => {
  it("rewards first-guess solves the most", () => {
    const r = scoreSolve({ guessNumber: 1, elapsedMs: 0 });
    expect(r.solverPoints).toBe(30);
    expect(r.senderPoints).toBe(0);
  });

  it("gives 2nd-guess bonus and speed bonus", () => {
    const r = scoreSolve({ guessNumber: 2, elapsedMs: 5_000 });
    expect(r.solverPoints).toBe(23);
    expect(r.senderPoints).toBe(5);
  });

  it("gives 3rd-guess bonus and caps speed bonus at 0 once over 15s", () => {
    const r = scoreSolve({ guessNumber: 3, elapsedMs: 30_000 });
    expect(r.solverPoints).toBe(11);
    expect(r.senderPoints).toBe(30);
  });

  it("gives no guess bonus for guesses beyond the 3rd, but still scores a solve", () => {
    const r = scoreSolve({ guessNumber: 7, elapsedMs: 20_000 });
    // base 10 + guess bonus 0 + speed bonus 0
    expect(r.solverPoints).toBe(10);
    expect(r.senderPoints).toBe(20);
  });
});

describe("scoreMatchEndExpire", () => {
  it("returns elapsed seconds, capped at match duration", () => {
    expect(scoreMatchEndExpire({ elapsedMs: 7_500 }).senderPoints).toBe(7);
    expect(scoreMatchEndExpire({ elapsedMs: 200_000 }).senderPoints).toBe(60);
  });
});
