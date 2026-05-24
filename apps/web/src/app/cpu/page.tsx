"use client";
import { useEffect, useMemo, useState } from "react";
import type { MatchResultSummary } from "@worduel/shared";
import { useCpuStore, type CpuDifficulty } from "@/store/cpuStore";
import { HUD } from "@/components/HUD";
import { PuzzleBoard } from "@/components/PuzzleBoard";
import { SendPanel } from "@/components/SendPanel";
import { ResolvedFeed } from "@/components/ResolvedFeed";
import { EndScreen } from "@/components/EndScreen";
import { ToastStack } from "@/components/Toast";
import { CenterFlash } from "@/components/CenterFlash";
import { useTick } from "@/lib/clock";
import { useT } from "@/lib/i18n";
import { useResolvedNotifier, type NotifyEvent } from "@/hooks/useResolvedNotifier";

export default function CpuPage() {
  const store = useCpuStore();
  const t = useT();
  useTick(250);

  const [toasts, setToasts] = useState<NotifyEvent[]>([]);
  const [flash, setFlash] = useState<NotifyEvent | null>(null);

  const startCpuMatch = (difficulty: CpuDifficulty) => {
    setToasts([]);
    setFlash(null);
    store.start(difficulty);
  };

  useEffect(() => {
    useCpuStore.getState().stop();
  }, []);

  useEffect(() => {
    if (store.phase !== "running") return;
    const handle = setInterval(() => store.tick(), 250);
    return () => clearInterval(handle);
  }, [store.phase, store]);

  useEffect(() => {
    if (store.phase !== "running") return;
    setToasts([]);
    setFlash(null);
  }, [store.phase, store.matchId]);

  const state = useMemo(
    () => store.toMatchState(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      store.playerScore,
      store.cpuScore,
      store.playerIncoming,
      store.cpuIncoming,
      store.recentlyResolved,
      store.phase,
      store.matchId,
      store.startedAt,
      store.endsAt,
      store.playerTokensSpent,
      store.cpuTokensSpent,
    ],
  );
  const me = state.players[0] ?? null;
  const meId = me?.id ?? null;

  const localizedState = useMemo(() => {
    if (!me) return state;
    const next = { ...state, players: state.players.map((p) => ({ ...p })) };
    next.players[0] = { ...next.players[0]!, name: t("cpu.nameYou") };
    if (next.players[1]) {
      next.players[1] = {
        ...next.players[1]!,
        name: t("cpu.nameCpu", { difficulty: t(`cpu.difficulty${cap(store.difficulty)}`) }),
      };
    }
    return next;
  }, [state, me, t, store.difficulty]);

  useResolvedNotifier(localizedState, meId, (n) => {
    if (n.big) setFlash(n);
    else setToasts((arr) => [...arr, n]);
  }, store.matchId);

  if (store.phase === "idle") {
    return <DifficultyPicker onStart={startCpuMatch} />;
  }

  if (!me) return null;
  const incomingForMe = localizedState.incoming[me.id] ?? [];

  return (
    <div className="space-y-4">
      <HUD state={localizedState} meId={me.id} />

      {store.phase === "finished" && store.summary && (
        <EndScreen
          summary={localizeSummary(store.summary, t, store.difficulty)}
          meId={me.id}
          state={localizedState}
          onPlayAgain={() => startCpuMatch(store.difficulty)}
        />
      )}

      {store.phase === "running" && (
        <div className="space-y-4">
          <PuzzleBoard
            puzzles={incomingForMe}
            onSubmitGuess={(g) => store.submitGuess(g)}
          />
          <SendPanel
            me={localizedState.players[0]!}
            fetchCandidates={async () => store.drawCandidates()}
            onSend={(cid) => store.sendPuzzle(cid)}
          />
        </div>
      )}

      <ResolvedFeed state={localizedState} meId={me.id} />

      <ToastStack
        items={toasts}
        onDismiss={(id) => setToasts((arr) => arr.filter((x) => x.id !== id))}
      />
      {flash && (
        <CenterFlash
          text={flash.text}
          tone={flash.tone === "bad" ? "bad" : "good"}
          onDone={() => setFlash(null)}
        />
      )}
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function localizeSummary(
  s: MatchResultSummary,
  t: ReturnType<typeof useT>,
  difficulty: CpuDifficulty,
) {
  return {
    ...s,
    players: s.players.map((p, i) => ({
      ...p,
      name:
        i === 0
          ? t("cpu.nameYou")
          : t("cpu.nameCpu", { difficulty: t(`cpu.difficulty${cap(difficulty)}`) }),
    })),
  };
}

function DifficultyPicker({ onStart }: { onStart: (d: CpuDifficulty) => void }) {
  const t = useT();
  const [d, setD] = useState<CpuDifficulty>("normal");
  return (
    <div className="card">
      <h1 className="text-xl font-semibold">{t("cpu.title")}</h1>
      <p className="mt-1 text-sm text-ink-200">{t("cpu.description")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["easy", "normal", "hard"] as CpuDifficulty[]).map((opt) => (
          <button
            key={opt}
            onClick={() => setD(opt)}
            className={`btn-secondary ${d === opt ? "ring-2 ring-accent-500" : ""}`}
          >
            {t(`cpu.difficulty${cap(opt)}`)}
          </button>
        ))}
      </div>
      <button onClick={() => onStart(d)} className="btn-primary mt-5">
        {t("cpu.start")}
      </button>
    </div>
  );
}
