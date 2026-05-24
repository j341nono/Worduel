import { MATCH_DURATION_SEC, PUZZLE_TIME_LIMIT_SEC } from "@worduel/shared";

export interface SolveScoreInput {
  guessNumber: number; // 1-indexed; bonus is only awarded for 1, 2, 3
  elapsedMs: number; // since puzzle.startedAt
}

export interface SolveScoreOutput {
  solverPoints: number;
  senderPoints: number;
  breakdown: {
    base: number;
    guessBonus: number;
    speedBonus: number;
    senderTimeBonus: number;
  };
}

const guessBonusTable: Record<number, number> = { 1: 5, 2: 3, 3: 1 };

/**
 * Score a solve. Guesses beyond the third receive no extra bonus, but the puzzle still
 * counts as solved (no per-puzzle guess cap anymore). Speed bonus rewards solving inside
 * the 15-second window; sender time bonus is capped only by the match duration.
 */
export function scoreSolve({ guessNumber, elapsedMs }: SolveScoreInput): SolveScoreOutput {
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const speedWindow = Math.min(elapsedSec, PUZZLE_TIME_LIMIT_SEC);
  const matchCapped = Math.min(elapsedSec, MATCH_DURATION_SEC);

  const base = 10;
  const guessBonus = guessBonusTable[guessNumber] ?? 0;
  const speedBonus = Math.max(0, PUZZLE_TIME_LIMIT_SEC - speedWindow);
  const senderTimeBonus = matchCapped;

  return {
    solverPoints: base + guessBonus + speedBonus,
    senderPoints: senderTimeBonus,
    breakdown: { base, guessBonus, speedBonus, senderTimeBonus },
  };
}

export interface MatchEndExpireInput {
  elapsedMs: number; // ms the puzzle stayed unanswered, capped at match duration
}

export interface MatchEndExpireOutput {
  senderPoints: number;
}

/**
 * When the match clock runs out with a puzzle still active, the sender gets the time
 * bonus only — there is no fail bonus, because there is no longer a max-guesses fail mode.
 */
export function scoreMatchEndExpire({ elapsedMs }: MatchEndExpireInput): MatchEndExpireOutput {
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  return { senderPoints: Math.min(elapsedSec, MATCH_DURATION_SEC) };
}
