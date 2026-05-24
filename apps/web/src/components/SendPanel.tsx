"use client";
import { useEffect, useRef, useState } from "react";
import type { PlayerState, QuestionCandidate } from "@worduel/shared";
import { useT } from "@/lib/i18n";

export function SendPanel({
  me,
  fetchCandidates,
  onSend,
  disabled = false,
}: {
  me: PlayerState;
  fetchCandidates: () => Promise<QuestionCandidate[]>;
  onSend: (candidateId: string) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const [candidates, setCandidates] = useState<QuestionCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  // Auto-fetch a new candidate set whenever we have a token but no candidates yet.
  useEffect(() => {
    if (disabled) return;
    if (candidates !== null) return;
    if (me.tokens <= 0) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    fetchCandidates()
      .then((cs) => setCandidates(cs))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        inFlightRef.current = false;
      });
  }, [me.tokens, candidates, disabled, fetchCandidates]);

  const send = (id: string) => {
    onSend(id);
    // Clear current set; the effect re-fetches if there are still tokens.
    setCandidates(null);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-ink-200">{t("send.title")}</div>
        <div className="text-xs text-ink-200">{t("send.tokensHeld", { n: me.tokens })}</div>
      </div>

      {me.tokens <= 0 && !candidates && (
        <div className="mt-3 rounded-md border border-dashed border-ink-800/70 bg-ink-900/40 p-4 text-center text-sm text-ink-200/80">
          {t("send.noToken")}
        </div>
      )}

      {me.tokens > 0 && loading && !candidates && (
        <div className="mt-3 rounded-md border border-ink-800/70 bg-ink-900/40 p-4 text-center text-sm text-ink-200">
          {t("send.drawing")}
        </div>
      )}

      {candidates && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => send(c.id)}
              className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-3 text-center text-xl font-bold uppercase tracking-widest hover:border-accent-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled || me.tokens <= 0}
            >
              {c.word}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-ink-200/80">{t("send.hint")}</p>
    </div>
  );
}
