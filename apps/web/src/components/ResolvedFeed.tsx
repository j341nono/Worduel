"use client";
import type { MatchState, Puzzle } from "@worduel/shared";
import clsx from "clsx";
import { useT } from "@/lib/i18n";

export function ResolvedFeed({ state, meId }: { state: MatchState; meId: string | null }) {
  const t = useT();
  if (state.recentlyResolved.length === 0) return null;
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-widest text-ink-200">{t("feed.title")}</div>
      <ul className="mt-2 space-y-1.5">
        {state.recentlyResolved.slice(0, 5).map((p) => (
          <ResolvedRow key={p.id} p={p} meId={meId} />
        ))}
      </ul>
    </div>
  );
}

function ResolvedRow({ p, meId }: { p: Puzzle; meId: string | null }) {
  const t = useT();
  const isShared = p.fromPlayerId === p.toPlayerId;
  const meSent = p.fromPlayerId === meId;
  const solved = p.status === "solved";

  const sentLabel = isShared
    ? p.toPlayerId === meId
      ? t("feed.yourPuzzle")
      : t("feed.opponentPuzzle")
    : meSent
      ? t("feed.youSent")
      : t("feed.oppSent");
  const verbKey = isShared
    ? solved
      ? "feed.sharedSolved"
      : "feed.sharedMissed"
    : meSent
      ? solved
        ? "feed.solvedByThem"
        : "feed.missedByThem"
      : solved
        ? "feed.solvedByYou"
        : "feed.missedByYou";
  const status =
    p.status === "solved"
      ? t("feed.statusSolved")
      : p.status === "expired"
        ? t("feed.statusExpired")
        : t("feed.statusFailed");

  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-ink-200">
        {sentLabel}
        <span className="mx-1 chip uppercase font-mono">{p.answer ?? "???"}</span>
        {t(verbKey)}
      </span>
      <span className={clsx("text-xs", solved ? "text-good" : "text-bad")}>{status}</span>
    </li>
  );
}
