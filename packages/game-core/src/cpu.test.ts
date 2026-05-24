import { describe, expect, it } from "vitest";
import { candidatesFromFeedback, cpuProfiles, simulateCpuSolve } from "./cpu.js";

describe("candidatesFromFeedback", () => {
  it("returns all words on empty history", () => {
    const pool = candidatesFromFeedback([]);
    expect(pool.length).toBeGreaterThan(100);
  });

  it("narrows pool given a feedback hint", () => {
    // After guessing "cat" and learning the answer was "bat", the pool should
    // only include words consistent with that feedback (e.g., still 3 letters,
    // ending in -at with first letter not c).
    const pool = candidatesFromFeedback([{ guess: "cat", answer: "bat" }]);
    expect(pool).toContain("bat");
    expect(pool).not.toContain("cat");
  });
});

describe("simulateCpuSolve", () => {
  it("can produce a solve outcome", () => {
    // Deterministic-ish: pin rng to always return 0 — picks first candidate, no give-up.
    const rng = () => 0;
    const res = simulateCpuSolve({ answer: "cat", profile: cpuProfiles.hard, rng });
    expect(["solved", "failed"]).toContain(res.outcome);
    expect(res.guesses.length).toBeGreaterThan(0);
    expect(res.guesses.length).toBeLessThanOrEqual(3);
  });
});
