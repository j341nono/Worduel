"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useOnlineStore } from "@/store/onlineStore";
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

export default function OnlinePage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="card text-ink-200">{t("online.loading")}</div>}>
      <OnlinePageInner />
    </Suspense>
  );
}

function OnlinePageInner() {
  const params = useSearchParams();
  const initialMode = params?.get("mode") === "join" ? "join" : "create";
  const store = useOnlineStore();
  useTick(250);

  const [toasts, setToasts] = useState<NotifyEvent[]>([]);
  const [flash, setFlash] = useState<NotifyEvent | null>(null);

  useEffect(() => {
    store.init();
  }, [store]);

  useEffect(() => {
    if (!store.toast) return;
    setToasts((arr) => [
      ...arr,
      { id: `srv-${Date.now()}`, text: store.toast!.text, tone: store.toast!.tone },
    ]);
    store.setToast(null);
  }, [store.toast, store]);

  useResolvedNotifier(store.state, store.playerId, (n) => {
    if (n.big) setFlash(n);
    else setToasts((arr) => [...arr, n]);
  }, store.state?.matchId);

  if (!store.roomCode || !store.playerId || !store.state || store.state.phase === "lobby") {
    return (
      <>
        <Lobby initialMode={initialMode} />
        <ToastStack
          items={toasts}
          onDismiss={(id) => setToasts((arr) => arr.filter((x) => x.id !== id))}
        />
      </>
    );
  }

  const state = store.state;
  const me = state.players.find((p) => p.id === store.playerId);
  if (!me) return null;
  const incomingForMe = state.incoming[me.id] ?? [];

  return (
    <div className="space-y-4">
      <HUD state={state} meId={me.id} />
      {store.summary ? (
        <EndScreen
          summary={store.summary}
          meId={me.id}
          state={state}
          onPlayAgain={() => store.reset()}
        />
      ) : (
        <div className="space-y-4">
          <PuzzleBoard
            puzzles={incomingForMe}
            onSubmitGuess={(g) => {
              store.submitGuess(g).catch((e: Error) =>
                setToasts((arr) => [
                  ...arr,
                  { id: `err-${Date.now()}`, text: e.message, tone: "bad" },
                ]),
              );
            }}
            disabled={state.phase !== "running"}
          />
          <SendPanel
            me={me}
            fetchCandidates={() => store.fetchCandidates()}
            onSend={(cid) => {
              store.sendQuestion(cid).catch((e: Error) =>
                setToasts((arr) => [
                  ...arr,
                  { id: `err-${Date.now()}`, text: e.message, tone: "bad" },
                ]),
              );
            }}
            disabled={state.phase !== "running"}
          />
        </div>
      )}
      <ResolvedFeed state={state} meId={me.id} />

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

function Lobby({ initialMode }: { initialMode: "create" | "join" }) {
  const store = useOnlineStore();
  const t = useT();
  const [mode, setMode] = useState<"create" | "join">(initialMode);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("worduel-name");
      if (saved) setName(saved);
    } catch {}
  }, []);
  useEffect(() => {
    if (name) {
      try {
        window.localStorage.setItem("worduel-name", name);
      } catch {}
    }
  }, [name]);

  if (store.roomCode && store.state?.phase === "lobby") {
    const filled = store.state.players.length >= 2;
    return (
      <div className="card">
        <h2 className="text-xl font-semibold">{t("online.roomTitle", { code: store.roomCode })}</h2>
        <p className="mt-1 text-sm text-ink-200">{t("online.shareCode")}</p>
        <div className="mt-3 text-3xl font-mono tracking-widest">{store.roomCode}</div>
        <div className="mt-4">
          <div className="text-xs uppercase tracking-widest text-ink-200">{t("online.players")}</div>
          <ul className="mt-2 space-y-1">
            {store.state.players.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span>{p.name}</span>
                <span className="text-ink-200">
                  {p.id === store.playerId ? t("online.you") : t("online.opponent")}
                </span>
              </li>
            ))}
            {!filled && (
              <li className="text-sm text-ink-200">{t("online.waitingSecondPlayer")}</li>
            )}
          </ul>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => store.startMatch().catch((e: Error) => setErr(e.message))}
            disabled={!filled || busy}
            className="btn-primary disabled:opacity-50"
          >
            {t("online.startMatch")}
          </button>
          <button onClick={() => store.leaveRoom()} className="btn-ghost">
            {t("online.leaveRoom")}
          </button>
        </div>
        {err && <div className="mt-2 text-sm text-bad">{err}</div>}
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold">{t("online.title")}</h2>
      <div className="mt-3 flex gap-2 text-sm">
        <button
          onClick={() => setMode("create")}
          className={`btn-secondary ${mode === "create" ? "ring-2 ring-accent-500" : ""}`}
        >
          {t("online.create")}
        </button>
        <button
          onClick={() => setMode("join")}
          className={`btn-secondary ${mode === "join" ? "ring-2 ring-accent-500" : ""}`}
        >
          {t("online.join")}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:max-w-md">
        <label className="text-sm">
          <div className="text-ink-200 mb-1">{t("online.displayName")}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
            placeholder={t("online.displayNamePlaceholder")}
            maxLength={20}
          />
        </label>
        {mode === "join" && (
          <label className="text-sm">
            <div className="text-ink-200 mb-1">{t("online.roomCode")}</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              className="input w-full font-mono tracking-widest"
              placeholder={t("online.roomCodePlaceholder")}
              maxLength={6}
            />
          </label>
        )}
        <button
          className="btn-primary"
          disabled={busy || !name.trim() || (mode === "join" && code.length !== 6)}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              if (mode === "create") await store.createRoom(name.trim());
              else await store.joinRoom(code, name.trim());
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode === "create" ? t("online.createRoom") : t("online.joinRoom")}
        </button>
        {err && <div className="text-sm text-bad">{err}</div>}
      </div>
    </div>
  );
}
