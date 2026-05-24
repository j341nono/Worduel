"use client";
import clsx from "clsx";
import { useState } from "react";
import { MAX_PUZZLE_SLOTS, WORD_LENGTH } from "@worduel/shared";
import type { Puzzle } from "@worduel/shared";
import { validateGuess } from "@worduel/game-core";
import { GuessGrid } from "./GuessGrid";
import { useT } from "@/lib/i18n";

export function PuzzleBoard({
  puzzles,
  onSubmitGuess,
  disabled = false,
}: {
  // The receiver's full timeline of incoming puzzles (active + solved/locked).
  puzzles: Puzzle[];
  onSubmitGuess: (guess: string) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const slotCount = MAX_PUZZLE_SLOTS;
  const activeCount = puzzles.filter((p) => p.status === "active").length;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr(null);
    const v = validateGuess(draft);
    if (!v.ok) {
      setErr(
        v.reason === "shape" ? t("puzzle.invalidShape") : t("puzzle.invalidDictionary"),
      );
      return;
    }
    if (activeCount === 0) {
      setErr(t("puzzle.noActiveYet"));
      return;
    }
    onSubmitGuess(v.word);
    setDraft("");
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-ink-200">
          {t("puzzle.incoming")}
        </div>
        <div className="text-xs text-ink-200">
          {t("puzzle.activeCount", { n: activeCount, total: slotCount })}
        </div>
      </div>

      <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: slotCount }).map((_, i) => {
          const p = puzzles[i];
          return <Slot key={i} index={i + 1} puzzle={p} pendingLetters={draft.toLowerCase()} />;
        })}
      </div>

      <form onSubmit={submit} className="mt-5 flex items-center justify-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) =>
            setDraft(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, WORD_LENGTH))
          }
          className="input w-36 text-center text-xl tracking-widest uppercase"
          placeholder={t("puzzle.placeholder")}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || draft.length !== WORD_LENGTH}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("puzzle.guessBtn")}
        </button>
      </form>

      {err && <div className="mt-2 text-center text-sm text-bad">{err}</div>}
      <p className="mt-3 text-center text-xs text-ink-200/70">{t("puzzle.sharedHint")}</p>
    </div>
  );
}

function Slot({
  index,
  puzzle,
  pendingLetters,
}: {
  index: number;
  puzzle: Puzzle | undefined;
  pendingLetters: string;
}) {
  const t = useT();

  if (!puzzle) {
    return (
      <div className="rounded-lg border border-dashed border-ink-800/70 bg-ink-900/40 p-3 opacity-60">
        <div className="flex items-center justify-between text-xs text-ink-200/70">
          <span>#{index}</span>
          <span>{t("puzzle.slotEmpty")}</span>
        </div>
        <div className="mt-2 flex h-12 items-center justify-center text-xs text-ink-200/50">
          {t("puzzle.slotWaiting")}
        </div>
      </div>
    );
  }

  const isLocked = puzzle.status !== "active";
  const statusLabel =
    puzzle.status === "solved"
      ? t("puzzle.solved")
      : puzzle.status === "failed"
        ? t("puzzle.failed")
        : puzzle.status === "expired"
          ? t("puzzle.expired")
          : t("puzzle.slotActive");

  return (
    <div
      className={clsx(
        "rounded-lg border p-3 transition",
        puzzle.status === "solved"
          ? "border-good/60 bg-good/10"
          : isLocked
            ? "border-ink-800/70 bg-ink-900/40 opacity-80"
            : "border-accent-500/50 bg-ink-900",
      )}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-200">#{index}</span>
        <span
          className={clsx(
            "font-semibold",
            puzzle.status === "solved" && "text-good",
            (puzzle.status === "failed" || puzzle.status === "expired") && "text-bad",
            puzzle.status === "active" && "text-accent-400",
          )}
        >
          {statusLabel}
        </span>
      </div>
      <div className="mt-2 flex justify-center">
        <GuessGrid
          guesses={puzzle.guesses}
          pendingLetters={isLocked ? "" : pendingLetters}
        />
      </div>
      {puzzle.answer && (
        <div className="mt-2 text-center text-xs text-ink-200">
          {t("puzzle.word")}{" "}
          <b className="uppercase tracking-widest text-ink-50">{puzzle.answer}</b>
        </div>
      )}
    </div>
  );
}
