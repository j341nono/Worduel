"use client";
import { MAX_STORED_TOKENS } from "@worduel/shared";
import type { MatchState, PlayerState } from "@worduel/shared";
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
      <PlayerCard player={me} label={t("hud.you")} align="left" />
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-ink-200">{t("hud.time")}</div>
        <div className="font-mono text-4xl font-bold tabular-nums">
          {remaining.toString().padStart(2, "0")}s
        </div>
        <div className="mt-1 text-xs text-ink-200">{phaseLabel}</div>
      </div>
      <PlayerCard player={opp} label={t("hud.opponent")} align="right" />
    </div>
  );
}

function PlayerCard({
  player,
  label,
  align,
}: {
  player?: PlayerState;
  label: string;
  align: "left" | "right";
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
      <Tokens count={player.tokens} align={align} />
    </div>
  );
}

function Tokens({ count, align }: { count: number; align: "left" | "right" }) {
  return (
    <div className={clsx("mt-3 flex gap-1", align === "right" && "justify-end")}>
      {Array.from({ length: MAX_STORED_TOKENS }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            "h-3 w-6 rounded-full border",
            i < count ? "bg-accent-500 border-accent-500" : "border-ink-800 bg-ink-900",
          )}
        />
      ))}
    </div>
  );
}
