"use client";
import clsx from "clsx";
import { WORD_LENGTH } from "@worduel/shared";
import type { GuessRecord, LetterFeedback } from "@worduel/shared";

function tileClass(fb?: LetterFeedback, size: "sm" | "md" = "md"): string {
  return clsx(
    "flex items-center justify-center rounded-md border font-bold uppercase transition-colors",
    size === "md" ? "h-10 w-10 text-lg" : "h-8 w-8 text-base",
    fb === "correct" && "bg-good border-good text-white shadow-soft",
    fb === "present" && "bg-warn border-warn text-ink-950 shadow-soft",
    fb === "absent" && "bg-ink-900 border-2 border-bad/60 text-ink-200/60 line-through decoration-bad/70",
    !fb && "bg-ink-900 border border-ink-800/60 text-ink-100",
  );
}

/**
 * Renders one row per actual guess, plus a single "in-progress" row showing the
 * draft input (if `pendingLetters` is provided). The grid grows downward without an
 * upper bound — guesses are unlimited.
 */
export function GuessGrid({
  guesses,
  pendingLetters = "",
  size = "sm",
}: {
  guesses: GuessRecord[];
  pendingLetters?: string;
  size?: "sm" | "md";
}) {
  const showPending = pendingLetters.length > 0;

  return (
    <div className="flex flex-col gap-1">
      {guesses.map((g, ri) => (
        <div key={ri} className="flex gap-1">
          {g.feedback.map((c, ci) => (
            <div key={ci} className={tileClass(c.feedback, size)}>
              {c.letter}
            </div>
          ))}
        </div>
      ))}
      {showPending && (
        <div className="flex gap-1">
          {Array.from({ length: WORD_LENGTH }).map((_, i) => (
            <div key={i} className={tileClass(undefined, size)}>
              {pendingLetters[i] ?? ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
