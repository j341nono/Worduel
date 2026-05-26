"use client";
import { useEffect, useRef } from "react";
import type { MatchState, Puzzle } from "@worduel/shared";
import { useT } from "@/lib/i18n";

export interface NotifyEvent {
  id: string;
  tone: "good" | "bad" | "info";
  text: string;
  big?: boolean;
}

export function useResolvedNotifier(
  state: MatchState | null,
  meId: string | null,
  push: (n: NotifyEvent) => void,
  resetKey?: string | null,
) {
  const t = useT();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    seenRef.current.clear();
  }, [resetKey]);

  useEffect(() => {
    if (!state || !meId) return;
    for (const p of state.recentlyResolved) {
      if (seenRef.current.has(p.id)) continue;
      seenRef.current.add(p.id);
      const note = buildNote(p, meId, t);
      if (note) push(note);
    }
  }, [state, meId, t, push]);
}

function buildNote(
  p: Puzzle,
  meId: string,
  t: ReturnType<typeof useT>,
): NotifyEvent | null {
  const word = (p.answer ?? "???").toUpperCase();
  const isShared = p.fromPlayerId === p.toPlayerId;
  const iSent = p.fromPlayerId === meId;
  const iSolved = p.toPlayerId === meId && p.status === "solved";

  if (iSolved) {
    return { id: p.id, tone: "good", text: t("notify.youSolved", { word }) };
  }
  if (p.toPlayerId === meId && (p.status === "failed" || p.status === "expired")) {
    return { id: p.id, tone: "bad", text: t("notify.youMissed", { word }) };
  }
  if (isShared) return null;
  if (iSent && p.status === "solved") {
    return { id: p.id, tone: "bad", text: t("notify.oppSolvedYours", { word }), big: true };
  }
  if (iSent && (p.status === "failed" || p.status === "expired")) {
    return { id: p.id, tone: "good", text: t("notify.oppFailedYours", { word }), big: true };
  }
  return null;
}
