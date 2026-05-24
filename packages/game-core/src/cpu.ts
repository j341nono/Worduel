import { MAX_GUESSES_PER_PUZZLE, PUZZLE_TIME_LIMIT_SEC } from "@worduel/shared";
import { THREE_LETTER_WORDS } from "@worduel/word-dictionary";
import { computeFeedback, isAllCorrect } from "./feedback.js";

export type CpuDifficulty = "easy" | "normal" | "hard";

export interface CpuProfile {
  // Per-guess delay range, in ms.
  minGuessDelayMs: number;
  maxGuessDelayMs: number;
  // Probability the CPU will give up rather than use its last guess (simulating mistakes).
  giveUpChance: number;
  // Probability the CPU "knows" the answer immediately (intuition shortcut).
  intuitionChance: number;
  // How often the CPU spends a token if one is available, per check tick (0..1).
  tokenSpendChance: number;
}

export const cpuProfiles: Record<CpuDifficulty, CpuProfile> = {
  easy: {
    minGuessDelayMs: 2500,
    maxGuessDelayMs: 5500,
    giveUpChance: 0.25,
    intuitionChance: 0.02,
    tokenSpendChance: 0.4,
  },
  normal: {
    minGuessDelayMs: 1500,
    maxGuessDelayMs: 3500,
    giveUpChance: 0.08,
    intuitionChance: 0.08,
    tokenSpendChance: 0.7,
  },
  hard: {
    minGuessDelayMs: 800,
    maxGuessDelayMs: 2200,
    giveUpChance: 0.0,
    intuitionChance: 0.18,
    tokenSpendChance: 0.95,
  },
};

/**
 * Returns the set of dictionary words still consistent with all guess feedback so far.
 * Used to make the CPU's next guess plausible.
 */
export function candidatesFromFeedback(history: { guess: string; answer: string }[]): string[] {
  // We don't actually need the answer at runtime; the CPU only sees its own feedback,
  // but for pure logic we model it as: given feedback for past guesses, eliminate
  // dictionary words that wouldn't have produced the same feedback.
  return THREE_LETTER_WORDS.filter((word) =>
    history.every(({ guess, answer }) => {
      // The candidate stays in the pool if pretending it is the answer would have
      // produced identical feedback for our previous guess.
      const expected = computeFeedback(guess, answer);
      const got = computeFeedback(guess, word);
      return expected.every((f, i) => f.feedback === got[i]?.feedback);
    }),
  );
}

/**
 * Pick the CPU's next guess given prior guesses. The harder the profile, the more
 * deterministically it converges; easy CPUs sometimes pick randomly.
 */
export function pickCpuGuess(input: {
  history: { guess: string; answer: string }[];
  profile: CpuProfile;
  rng?: () => number;
}): string {
  const rng = input.rng ?? Math.random;

  if (rng() < input.profile.intuitionChance && input.history.length > 0) {
    const last = input.history[input.history.length - 1];
    if (last && computeFeedback(last.guess, last.answer).every((f) => f.feedback === "correct")) {
      return last.guess;
    }
  }

  const pool = candidatesFromFeedback(input.history);
  const source = pool.length > 0 ? pool : THREE_LETTER_WORDS.slice();

  // Avoid repeating an already-tried guess if possible.
  const triedSet = new Set(input.history.map((h) => h.guess));
  const filtered = source.filter((w) => !triedSet.has(w));
  const finalPool = filtered.length > 0 ? filtered : source;

  const idx = Math.floor(rng() * finalPool.length);
  return finalPool[idx] ?? finalPool[0]!;
}

export interface CpuSolveSimResult {
  outcome: "solved" | "failed";
  guesses: { guess: string; elapsedMs: number }[];
}

/**
 * Simulate the CPU attempting to solve a puzzle (used for offline CPU mode preview/testing).
 * Returns a deterministic plan of guesses and timings.
 */
export function simulateCpuSolve(input: {
  answer: string;
  profile: CpuProfile;
  rng?: () => number;
}): CpuSolveSimResult {
  const rng = input.rng ?? Math.random;
  const history: { guess: string; answer: string }[] = [];
  const guesses: { guess: string; elapsedMs: number }[] = [];
  let elapsed = 0;

  for (let i = 0; i < MAX_GUESSES_PER_PUZZLE; i++) {
    if (rng() < input.profile.giveUpChance && i > 0) {
      return { outcome: "failed", guesses };
    }
    const delay =
      input.profile.minGuessDelayMs +
      Math.floor(rng() * (input.profile.maxGuessDelayMs - input.profile.minGuessDelayMs));
    elapsed += delay;
    if (elapsed > PUZZLE_TIME_LIMIT_SEC * 1000) {
      return { outcome: "failed", guesses };
    }
    const guess = pickCpuGuess({ history, profile: input.profile, rng });
    guesses.push({ guess, elapsedMs: elapsed });
    const feedback = computeFeedback(guess, input.answer);
    history.push({ guess, answer: input.answer });
    if (isAllCorrect(feedback)) {
      return { outcome: "solved", guesses };
    }
  }
  return { outcome: "failed", guesses };
}
