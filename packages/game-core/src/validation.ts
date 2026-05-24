import { WORD_LENGTH } from "@worduel/shared";
import { isValidWord, normalizeWord } from "@worduel/word-dictionary";

export type GuessValidation =
  | { ok: true; word: string }
  | { ok: false; reason: "shape" | "dictionary" };

/**
 * Validates a player guess: must be WORD_LENGTH alpha chars and exist in the dictionary.
 * Returns normalized lowercase word on success.
 */
export function validateGuess(input: string): GuessValidation {
  const w = normalizeWord(input);
  if (!/^[a-z]+$/.test(w) || w.length !== WORD_LENGTH) {
    return { ok: false, reason: "shape" };
  }
  if (!isValidWord(w)) return { ok: false, reason: "dictionary" };
  return { ok: true, word: w };
}
