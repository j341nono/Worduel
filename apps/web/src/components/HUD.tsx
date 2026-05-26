"use client";
import type { MatchState, PlayerId, PlayerState, Puzzle } from "@worduel/shared";
import clsx from "clsx";
import { useT } from "@/lib/i18n";

export function HUD({
  state,
  meId,
}: {
  state: MatchState;
  meId: string | null;
}) {
  const t = useT();
  const me = state.players.find((p) => p.id === meId);
  const opp = state.players.find((p) => p.id !== meId);
  const remaining =
    state.endsAt && state.phase === "running"
      ? Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000))
      : state.phase === "finished"
        ? 0
        : 60;

  const phaseLabel =
    state.phase === "running"
      ? t("hud.phaseRunning")
      : state.phase === "finished"
        ? t("hud.phaseFinished")
        : t("hud.phaseLobby");

  return (
    <div className="grid grid-cols-3 items-center gap-3">
      <PlayerCard
        player={me}
        label={t("hud.you")}
        align="left"
        solved={countSolved(state, me?.id)}
        total={countTotal(state, me?.id)}
      />
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-ink-200">{t("hud.time")}</div>
        <div className="font-mono text-4xl font-bold tabular-nums">
          {remaining.toString().padStart(2, "0")}s
        </div>
        <div className="mt-1 text-xs text-ink-200">{phaseLabel}</div>
      </div>
      <PlayerCard
        player={opp}
        label={t("hud.opponent")}
        align="right"
        solved={countSolved(state, opp?.id)}
        total={countTotal(state, opp?.id)}
      />
    </div>
  );
}

function PlayerCard({
  player,
  label,
  align,
  solved,
  total,
}: {
  player?: PlayerState;
  label: string;
  align: "left" | "right";
  solved: number;
  total: number;
}) {
  const t = useT();
  if (!player) {
    return (
      <div className={clsx("card text-ink-200", align === "right" && "text-right")}>
        <div className="text-xs uppercase tracking-widest">{label}</div>
        <div className="text-lg font-semibold">{t("hud.waiting")}</div>
      </div>
    );
  }
  return (
    <div className={clsx("card", align === "right" && "text-right")}>
      <div className={clsx("flex items-center gap-2", align === "right" ? "justify-end flex-row-reverse" : "justify-between")}>
        <span className="text-xs uppercase tracking-widest text-ink-200">{label}</span>
        {!player.connected && <span className="chip bg-bad/80 text-white">{t("hud.offline")}</span>}
      </div>
      <div className="mt-1 text-lg font-semibold truncate">{player.name}</div>
      <div
        className={clsx(
          "mt-2 flex items-baseline gap-2",
          align === "right" && "justify-end",
        )}
      >
        <span className="font-mono text-3xl font-bold tabular-nums">{player.score}</span>
        <span className="text-xs text-ink-200">{t("hud.pts")}</span>
      </div>
      <SolvedMeter solved={solved} total={total} align={align} />
    </div>
  );
}

function SolvedMeter({
  solved,
  total,
  align,
}: {
  solved: number;
  total: number;
  align: "left" | "right";
}) {
  const t = useT();
  return (
    <div className={clsx("mt-3 text-xs text-ink-200", align === "right" && "text-right")}>
      {t("hud.solved", { solved, total })}
    </div>
  );
}

function countSolved(state: MatchState, playerId: string | undefined): number {
  if (!playerId) return 0;
  return getPuzzles(state, playerId).filter((p) => p.status === "solved").length;
}

function countTotal(state: MatchState, playerId: string | undefined): number {
  if (!playerId) return 0;
  return getPuzzles(state, playerId).length;
}

function getPuzzles(state: MatchState, playerId: string): Puzzle[] {
  return state.incoming[playerId as PlayerId] ?? [];
}
