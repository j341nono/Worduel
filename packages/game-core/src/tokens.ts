import {
  MAX_LIFETIME_TOKENS,
  MAX_STORED_TOKENS,
  TOKEN_INITIAL_OFFSET_SEC,
  TOKEN_INTERVAL_SEC,
} from "@worduel/shared";

/**
 * Number of tokens "earned" (lifetime) so far in the match, capped at MAX_LIFETIME_TOKENS.
 * Tokens accrue at TOKEN_INITIAL_OFFSET_SEC + k * TOKEN_INTERVAL_SEC for k = 0..N-1.
 * With defaults (offset=5, interval=10, max=5), tokens land at 5/15/25/35/45 seconds.
 */
function tokensEarned(elapsedMs: number): number {
  if (elapsedMs < TOKEN_INITIAL_OFFSET_SEC * 1000) return 0;
  const sinceFirst = elapsedMs - TOKEN_INITIAL_OFFSET_SEC * 1000;
  const earned = 1 + Math.floor(sinceFirst / (TOKEN_INTERVAL_SEC * 1000));
  return Math.min(MAX_LIFETIME_TOKENS, earned);
}

/**
 * Current token count: lifetime earned minus tokens already spent, clamped to the
 * per-player storage cap.
 */
export function computeTokenCount(input: {
  matchStartMs: number;
  nowMs: number;
  tokensSpent: number;
}): number {
  const { matchStartMs, nowMs, tokensSpent } = input;
  if (nowMs <= matchStartMs) return 0;
  const earned = tokensEarned(nowMs - matchStartMs);
  const net = earned - tokensSpent;
  if (net < 0) return 0;
  return Math.min(MAX_STORED_TOKENS, net);
}

/**
 * Returns ms remaining until the next token is earned, or null if no further token will
 * be issued in this match.
 */
export function msUntilNextToken(input: {
  matchStartMs: number;
  nowMs: number;
  tokensSpent: number;
}): number | null {
  const elapsed = input.nowMs - input.matchStartMs;
  const earned = tokensEarned(elapsed);
  if (earned >= MAX_LIFETIME_TOKENS) return null;
  // The next token boundary is offset + earned * interval (0-indexed boundary count
  // equals the count of tokens already earned).
  const nextBoundaryMs =
    TOKEN_INITIAL_OFFSET_SEC * 1000 + earned * TOKEN_INTERVAL_SEC * 1000;
  return Math.max(0, nextBoundaryMs - elapsed);
}
