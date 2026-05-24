"use client";
import Link from "next/link";
import clsx from "clsx";
import type { MatchResultSummary, MatchState, PlayerId, Puzzle } from "@worduel/shared";
import { useT } from "@/lib/i18n";
import { GuessGrid } from "./GuessGrid";

export function EndScreen({
  summary,
  meId,
  state,
  onPlayAgain,
}: {
  summary: MatchResultSummary;
  meId: string | null;
  state?: MatchState | null;
  onPlayAgain?: () => void;
}) {
  const t = useT();
  const winner = summary.winnerPlayerId
    ? summary.players.find((p) => p.playerId === summary.winnerPlayerId)
    : null;
  const winnerName = winner?.name ?? "";
  const mePlayer = summary.players.find((p) => p.playerId === meId);
  const youWon = summary.winnerPlayerId !== null && summary.winnerPlayerId === meId;
  const draw = summary.winnerPlayerId === null;

  const headline = draw
    ? t("end.draw")
    : youWon
      ? t("end.youWon")
      : t("end.oppWon", { name: winnerName });
  const opponentId = summary.players.find((p) => p.playerId !== meId)?.playerId ?? null;
  const myPuzzles = getPuzzlesForPlayer(state, meId);
  const opponentPuzzles = getPuzzlesForPlayer(state, opponentId);
  const opponentName = summary.players.find((p) => p.playerId === opponentId)?.name ?? t("hud.opponent");

  return (
    <div className="space-y-4">
      <div className="card text-center">
        <div className="text-xs uppercase tracking-widest text-ink-200">{t("end.finished")}</div>
        <h2 className="mt-2 text-3xl font-bold">{headline}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {summary.players.map((p) => (
            <div
              key={p.playerId}
              className={`rounded-lg border p-4 ${
                p.playerId === summary.winnerPlayerId
                  ? "border-accent-500 bg-accent-500/10"
                  : "border-ink-800 bg-ink-900"
              }`}
            >
              <div className="text-sm text-ink-200">
                {p.playerId === meId ? t("hud.you") : t("hud.opponent")}
                {p.isCpu ? t("end.cpuSuffix") : ""}
              </div>
              <div className="mt-1 text-lg font-semibold truncate">{p.name}</div>
              <div className="mt-2 font-mono text-3xl font-bold">{p.score}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {onPlayAgain && (
            <button onClick={onPlayAgain} className="btn-primary">
              {t("end.playAgain")}
            </button>
          )}
          <Link href="/" className="btn-secondary">
            {t("end.home")}
          </Link>
        </div>
        {mePlayer && (
          <p className="sr-only">{t("end.yourFinalScore", { n: mePlayer.score })}</p>
        )}
      </div>

      {state && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AttemptColumn
            title={t("end.yourAttempts")}
            playerName={mePlayer?.name ?? t("hud.you")}
            puzzles={myPuzzles}
            meId={meId}
          />
          <AttemptColumn
            title={t("end.opponentAttempts")}
            playerName={opponentName}
            puzzles={opponentPuzzles}
            meId={meId}
          />
        </div>
      )}
    </div>
  );
}

function getPuzzlesForPlayer(state: MatchState | null | undefined, playerId: string | null): Puzzle[] {
  if (!state || !playerId) return [];
  return state.incoming[playerId as PlayerId] ?? [];
}

function AttemptColumn({
  title,
  playerName,
  puzzles,
  meId,
}: {
  title: string;
  playerName: string;
  puzzles: Puzzle[];
  meId: string | null;
}) {
  const t = useT();
  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-200">{t("end.resultHistory")}</div>
          <h3 className="mt-1 text-lg font-semibold">{title}</h3>
        </div>
        <div className="max-w-[45%] truncate text-right text-sm text-ink-200">{playerName}</div>
      </div>

      {puzzles.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-ink-800/70 p-4 text-sm text-ink-200">
          {t("end.noAttempts")}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {puzzles.map((p, idx) => (
            <PuzzleAttempt key={p.id} puzzle={p} index={idx + 1} meId={meId} />
          ))}
        </div>
      )}
    </section>
  );
}

function PuzzleAttempt({
  puzzle,
  index,
  meId,
}: {
  puzzle: Puzzle;
  index: number;
  meId: string | null;
}) {
  const t = useT();
  const isSolved = puzzle.status === "solved";
  const isMine = puzzle.toPlayerId === meId;
  const sentBy = puzzle.fromPlayerId === meId ? t("feed.youSent") : t("feed.oppSent");
  const status =
    puzzle.status === "solved"
      ? t("feed.statusSolved")
      : puzzle.status === "expired"
        ? t("feed.statusExpired")
        : t("feed.statusFailed");

  return (
    <article className="rounded-lg border border-ink-800 bg-ink-900/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-ink-200">
            #{index} · {sentBy}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="chip font-mono uppercase tracking-widest">
              {puzzle.answer ?? "???"}
            </span>
            <span
              className={clsx(
                "text-xs font-semibold",
                isSolved ? "text-good" : "text-bad",
              )}
            >
              {status}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-ink-200">
          <div>{isMine ? t("end.youAnswered") : t("end.opponentAnswered")}</div>
          <div className="mt-1 font-mono text-ink-50">
            {t("end.guessCount", { n: puzzle.guesses.length })}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
        {puzzle.guesses.length > 0 ? (
          <GuessGrid guesses={puzzle.guesses} size="sm" />
        ) : (
          <div className="text-sm text-ink-200">{t("end.noGuesses")}</div>
        )}
      </div>
    </article>
  );
}
