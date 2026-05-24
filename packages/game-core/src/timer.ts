import { MATCH_DURATION_SEC } from "@worduel/shared";

export function matchEndAt(startedAtMs: number): number {
  return startedAtMs + MATCH_DURATION_SEC * 1000;
}

export function matchRemainingMs(startedAtMs: number, nowMs: number): number {
  return Math.max(0, matchEndAt(startedAtMs) - nowMs);
}

export function isMatchOver(startedAtMs: number, nowMs: number): boolean {
  return nowMs >= matchEndAt(startedAtMs);
}
