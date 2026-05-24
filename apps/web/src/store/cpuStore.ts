"use client";
import { create } from "zustand";
import {
  CANDIDATE_COUNT,
  MATCH_DURATION_SEC,
  MAX_STORED_TOKENS,
  WORD_LENGTH,
} from "@worduel/shared";
import type {
  MatchId,
  MatchResultSummary,
  MatchState,
  PlayerId,
  Puzzle,
  PuzzleId,
  QuestionCandidate,
} from "@worduel/shared";
import {
  computeFeedback,
  computeTokenCount,
  cpuProfiles,
  isAllCorrect,
  pickCpuGuess,
  scoreMatchEndExpire,
  scoreSolve,
} from "@worduel/game-core";
import { sampleWords } from "@worduel/word-dictionary";

export type CpuDifficulty = "easy" | "normal" | "hard";

interface CpuPuzzle extends Puzzle {
  answer: string;
  lastCpuThinkAt?: number;
}

interface CpuStore {
  matchId: MatchId | null;
  phase: "idle" | "running" | "finished";
  difficulty: CpuDifficulty;
  startedAt: number | null;
  endsAt: number | null;
  playerId: PlayerId;
  cpuId: PlayerId;
  playerScore: number;
  cpuScore: number;
  playerTokensSpent: number;
  cpuTokensSpent: number;
  // Both queues KEEP solved puzzles in place (locked slots).
  playerIncoming: CpuPuzzle[];
  cpuIncoming: CpuPuzzle[];
  recentlyResolved: CpuPuzzle[];
  candidates: QuestionCandidate[] | null;
  summary: MatchResultSummary | null;

  start: (difficulty: CpuDifficulty) => void;
  stop: () => void;
  tick: () => void;
  drawCandidates: () => QuestionCandidate[];
  sendPuzzle: (candidateId: string) => void;
  submitGuess: (guess: string) => { solvedPuzzleIds: PuzzleId[] };
  toMatchState: () => MatchState;
}

const PLAYER_ID = "p-you" as PlayerId;
const CPU_ID = "p-cpu" as PlayerId;
const MATCH_ID_FACTORY = () => (`m-${Math.random().toString(36).slice(2, 10)}` as MatchId);
const PUZZLE_ID_FACTORY = () => (`q-${Math.random().toString(36).slice(2, 10)}` as PuzzleId);

export const useCpuStore = create<CpuStore>((set, get) => ({
  matchId: null,
  phase: "idle",
  difficulty: "normal",
  startedAt: null,
  endsAt: null,
  playerId: PLAYER_ID,
  cpuId: CPU_ID,
  playerScore: 0,
  cpuScore: 0,
  playerTokensSpent: 0,
  cpuTokensSpent: 0,
  playerIncoming: [],
  cpuIncoming: [],
  recentlyResolved: [],
  candidates: null,
  summary: null,

  start(difficulty) {
    const now = Date.now();
    set({
      matchId: MATCH_ID_FACTORY(),
      phase: "running",
      difficulty,
      startedAt: now,
      endsAt: now + MATCH_DURATION_SEC * 1000,
      playerScore: 0,
      cpuScore: 0,
      playerTokensSpent: 0,
      cpuTokensSpent: 0,
      playerIncoming: [],
      cpuIncoming: [],
      recentlyResolved: [],
      candidates: null,
      summary: null,
    });
  },

  stop() {
    set({
      matchId: null,
      phase: "idle",
      startedAt: null,
      endsAt: null,
      playerScore: 0,
      cpuScore: 0,
      playerTokensSpent: 0,
      cpuTokensSpent: 0,
      summary: null,
      playerIncoming: [],
      cpuIncoming: [],
      recentlyResolved: [],
      candidates: null,
    });
  },

  tick() {
    const s = get();
    if (s.phase !== "running" || !s.startedAt || !s.endsAt) return;
    const now = Date.now();

    // 1) Match end: expire still-active puzzles, no fail bonus.
    if (now >= s.endsAt) {
      let playerScore = s.playerScore;
      let cpuScore = s.cpuScore;
      const newlyResolved: CpuPuzzle[] = [];
      for (const p of s.playerIncoming) {
        if (p.status !== "active") continue;
        p.status = "expired";
        p.resolvedAt = now;
        const r = scoreMatchEndExpire({ elapsedMs: now - p.startedAt });
        cpuScore += r.senderPoints;
        newlyResolved.push(p);
      }
      for (const p of s.cpuIncoming) {
        if (p.status !== "active") continue;
        p.status = "expired";
        p.resolvedAt = now;
        const r = scoreMatchEndExpire({ elapsedMs: now - p.startedAt });
        playerScore += r.senderPoints;
        newlyResolved.push(p);
      }
      const recentlyResolved = [...newlyResolved, ...s.recentlyResolved].slice(0, 8);
      const summary: MatchResultSummary = {
        matchId: s.matchId!,
        roomCode: "CPU",
        startedAt: s.startedAt,
        endedAt: now,
        players: [
          { playerId: s.playerId, name: "You", score: playerScore },
          { playerId: s.cpuId, name: `CPU (${s.difficulty})`, score: cpuScore, isCpu: true },
        ],
        winnerPlayerId:
          playerScore === cpuScore
            ? null
            : playerScore > cpuScore
              ? s.playerId
              : s.cpuId,
      };
      set({ phase: "finished", playerScore, cpuScore, recentlyResolved, summary });
      return;
    }

    // 2) CPU advances on the oldest active puzzle in its queue.
    const profile = cpuProfiles[s.difficulty];
    let cpuIncoming = s.cpuIncoming.slice();
    let playerScore = s.playerScore;
    let cpuScore = s.cpuScore;
    let recentlyResolved = s.recentlyResolved.slice();

    const active = cpuIncoming.find((p) => p.status === "active");
    if (active && shouldCpuGuess(active, profile, now)) {
      const history = active.guesses.map((g) => ({ guess: g.guess, answer: active.answer }));
      const guess = pickCpuGuess({ history, profile });
      const feedback = computeFeedback(guess, active.answer);
      active.guesses.push({ guess, feedback, submittedAt: now });
      active.lastCpuThinkAt = now;
      if (isAllCorrect(feedback)) {
        active.status = "solved";
        active.resolvedAt = now;
        const r = scoreSolve({
          guessNumber: active.guesses.length,
          elapsedMs: now - active.startedAt,
        });
        cpuScore += r.solverPoints;
        playerScore += r.senderPoints;
        recentlyResolved = [active, ...recentlyResolved].slice(0, 8);
      }
    }

    // 3) CPU may send a puzzle. Force-spend at storage cap, probabilistic otherwise.
    const cpuTokens = computeTokenCount({
      matchStartMs: s.startedAt,
      nowMs: now,
      tokensSpent: s.cpuTokensSpent,
    });
    let playerIncoming = s.playerIncoming.slice();
    let cpuTokensSpent = s.cpuTokensSpent;
    const forceSpend = cpuTokens >= MAX_STORED_TOKENS;
    const probSpend = cpuTokens > 0 && Math.random() < profile.tokenSpendChance / 4;
    if (forceSpend || probSpend) {
      const [w] = sampleWords(1);
      if (w) {
        const puzzle: CpuPuzzle = {
          id: PUZZLE_ID_FACTORY(),
          fromPlayerId: s.cpuId,
          toPlayerId: s.playerId,
          answer: w,
          guesses: [],
          status: "active",
          startedAt: now,
        };
        playerIncoming = [...playerIncoming, puzzle];
        cpuTokensSpent += 1;
      }
    }

    set({
      playerIncoming,
      cpuIncoming,
      playerScore,
      cpuScore,
      cpuTokensSpent,
      recentlyResolved,
    });
  },

  drawCandidates() {
    const s = get();
    if (s.phase !== "running" || !s.startedAt) return [];
    const tokens = computeTokenCount({
      matchStartMs: s.startedAt,
      nowMs: Date.now(),
      tokensSpent: s.playerTokensSpent,
    });
    if (tokens <= 0) return [];
    const words = sampleWords(CANDIDATE_COUNT);
    const candidates = words.map((w, i) => ({ id: `c${Date.now()}-${i}`, word: w }));
    set({ candidates });
    return candidates;
  },

  sendPuzzle(candidateId) {
    const s = get();
    if (!s.candidates || s.phase !== "running") return;
    const pick = s.candidates.find((c) => c.id === candidateId);
    if (!pick) return;
    const now = Date.now();
    const puzzle: CpuPuzzle = {
      id: PUZZLE_ID_FACTORY(),
      fromPlayerId: s.playerId,
      toPlayerId: s.cpuId,
      answer: pick.word,
      guesses: [],
      status: "active",
      startedAt: now,
    };
    set({
      cpuIncoming: [...s.cpuIncoming, puzzle],
      playerTokensSpent: s.playerTokensSpent + 1,
      candidates: null,
    });
  },

  submitGuess(guess) {
    const s = get();
    if (guess.length !== WORD_LENGTH || s.phase !== "running") {
      return { solvedPuzzleIds: [] };
    }
    const now = Date.now();
    const active = s.playerIncoming.filter((p) => p.status === "active");
    if (active.length === 0) return { solvedPuzzleIds: [] };

    let playerScore = s.playerScore;
    let cpuScore = s.cpuScore;
    let recentlyResolved = s.recentlyResolved.slice();
    const solvedPuzzleIds: PuzzleId[] = [];

    for (const puzzle of active) {
      const feedback = computeFeedback(guess, puzzle.answer);
      puzzle.guesses.push({ guess, feedback, submittedAt: now });
      if (isAllCorrect(feedback)) {
        puzzle.status = "solved";
        puzzle.resolvedAt = now;
        const r = scoreSolve({
          guessNumber: puzzle.guesses.length,
          elapsedMs: now - puzzle.startedAt,
        });
        playerScore += r.solverPoints;
        cpuScore += r.senderPoints;
        recentlyResolved = [puzzle, ...recentlyResolved].slice(0, 8);
        solvedPuzzleIds.push(puzzle.id);
      }
    }

    set({
      playerIncoming: [...s.playerIncoming],
      playerScore,
      cpuScore,
      recentlyResolved,
    });
    return { solvedPuzzleIds };
  },

  toMatchState() {
    const s = get();
    const now = Date.now();
    const playerTokens = s.startedAt
      ? computeTokenCount({
          matchStartMs: s.startedAt,
          nowMs: now,
          tokensSpent: s.playerTokensSpent,
        })
      : 0;
    const cpuTokens = s.startedAt
      ? computeTokenCount({
          matchStartMs: s.startedAt,
          nowMs: now,
          tokensSpent: s.cpuTokensSpent,
        })
      : 0;
    return {
      matchId: (s.matchId ?? "m-cpu") as MatchId,
      roomCode: "CPU",
      phase: s.phase === "idle" ? "lobby" : s.phase,
      ...(s.startedAt !== null ? { startedAt: s.startedAt } : {}),
      ...(s.endsAt !== null ? { endsAt: s.endsAt } : {}),
      serverNow: now,
      players: [
        {
          id: s.playerId,
          name: "You",
          score: s.playerScore,
          tokens: playerTokens,
          connected: true,
        },
        {
          id: s.cpuId,
          name: `CPU (${s.difficulty})`,
          score: s.cpuScore,
          tokens: cpuTokens,
          connected: true,
          isCpu: true,
        },
      ],
      incoming: {
        [s.playerId]: s.playerIncoming.map(stripAnswerIfActive),
        [s.cpuId]: s.cpuIncoming.map(stripAnswerIfActive),
      } as Record<PlayerId, Puzzle[]>,
      recentlyResolved: s.recentlyResolved.map((p) => ({ ...p })),
    };
  },
}));

function stripAnswerIfActive(p: CpuPuzzle): Puzzle {
  if (p.status === "active") {
    const { answer: _a, lastCpuThinkAt: _b, ...rest } = p;
    return rest;
  }
  const { lastCpuThinkAt: _b, ...rest } = p;
  return { ...rest };
}

function shouldCpuGuess(
  puzzle: CpuPuzzle,
  profile: { minGuessDelayMs: number; maxGuessDelayMs: number },
  now: number,
): boolean {
  const lastTs =
    puzzle.lastCpuThinkAt ??
    puzzle.guesses[puzzle.guesses.length - 1]?.submittedAt ??
    puzzle.startedAt;
  return now - lastTs >= profile.minGuessDelayMs;
}
