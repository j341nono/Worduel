import { WORD_LENGTH } from "@worduel/shared";
import type { GuessFeedback, LetterResult } from "@worduel/shared";

/**
 * Compute Wordle-like feedback. The answer can contain duplicate letters,
 * so we do two passes: first mark exact matches (correct), then "present"
 * based on the remaining letter pool. Letters not consumed produce "absent".
 *
 * Assumes both inputs are length WORD_LENGTH and lowercase.
 */
export function computeFeedback(guess: string, answer: string): GuessFeedback {
  if (guess.length !== WORD_LENGTH || answer.length !== WORD_LENGTH) {
    throw new Error(`Both guess and answer must be ${WORD_LENGTH} letters`);
  }

  const result: LetterResult[] = new Array(WORD_LENGTH);
  const remaining: Record<string, number> = {};

  // Pass 1: mark exact matches; collect leftover letters from the answer.
  for (let i = 0; i < WORD_LENGTH; i++) {
    const g = guess[i]!;
    const a = answer[i]!;
    if (g === a) {
      result[i] = { letter: g, feedback: "correct" };
    } else {
      remaining[a] = (remaining[a] ?? 0) + 1;
    }
  }

  // Pass 2: for non-correct positions, mark "present" if a leftover exists.
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i]) continue;
    const g = guess[i]!;
    if ((remaining[g] ?? 0) > 0) {
      result[i] = { letter: g, feedback: "present" };
      remaining[g] = (remaining[g] ?? 0) - 1;
    } else {
      result[i] = { letter: g, feedback: "absent" };
    }
  }

  return result;
}

export function isAllCorrect(feedback: GuessFeedback): boolean {
  return feedback.every((r) => r.feedback === "correct");
}
