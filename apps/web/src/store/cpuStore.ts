"use client";
import { create } from "zustand";
import {
  MATCH_DURATION_SEC,
  MAX_PUZZLE_SLOTS,
  WORD_LENGTH,
} from "@worduel/shared";
import type {
  MatchId,
  MatchResultSummary,
  MatchState,
  PlayerId,
  Puzzle,
  PuzzleId,
} from "@worduel/shared";
import {
  computeFeedback,
  cpuProfiles,
  isAllCorrect,
  pickCpuGuess,
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
  // Both queues KEEP solved puzzles in place (locked slots).
  playerIncoming: CpuPuzzle[];
  cpuIncoming: CpuPuzzle[];
  recentlyResolved: CpuPuzzle[];
  summary: MatchResultSummary | null;

  start: (difficulty: CpuDifficulty) => void;
  stop: () => void;
  tick: () => void;
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
  playerIncoming: [],
  cpuIncoming: [],
  recentlyResolved: [],
  summary: null,

  start(difficulty) {
    const now = Date.now();
    const words = sampleWords(MAX_PUZZLE_SLOTS);
    set({
      matchId: MATCH_ID_FACTORY(),
      phase: "running",
      difficulty,
      startedAt: now,
      endsAt: now + MATCH_DURATION_SEC * 1000,
      playerScore: 0,
      cpuScore: 0,
      playerIncoming: createSharedPuzzles(PLAYER_ID, words, now),
      cpuIncoming: createSharedPuzzles(CPU_ID, words, now),
      recentlyResolved: [],
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
      summary: null,
      playerIncoming: [],
      cpuIncoming: [],
      recentlyResolved: [],
    });
  },

  tick() {
    const s = get();
    if (s.phase !== "running" || !s.startedAt || !s.endsAt) return;
    const now = Date.now();

    // 1) Match end: expire still-active puzzles, no fail bonus.
    if (now >= s.endsAt) {
      const newlyResolved: CpuPuzzle[] = [];
      for (const p of s.playerIncoming) {
        if (p.status !== "active") continue;
        p.status = "expired";
        p.resolvedAt = now;
        newlyResolved.push(p);
      }
      for (const p of s.cpuIncoming) {
        if (p.status !== "active") continue;
        p.status = "expired";
        p.resolvedAt = now;
        newlyResolved.push(p);
      }
      const recentlyResolved = [...newlyResolved, ...s.recentlyResolved].slice(0, 8);
      const summary: MatchResultSummary = {
        matchId: s.matchId!,
        roomCode: "CPU",
        startedAt: s.startedAt,
        endedAt: now,
        players: [
          { playerId: s.playerId, name: "You", score: s.playerScore },
          { playerId: s.cpuId, name: `CPU (${s.difficulty})`, score: s.cpuScore, isCpu: true },
        ],
        winnerPlayerId:
          s.playerScore === s.cpuScore
            ? null
            : s.playerScore > s.cpuScore
              ? s.playerId
              : s.cpuId,
      };
      set({ phase: "finished", recentlyResolved, summary });
      return;
    }

    // 2) CPU advances on the oldest active puzzle in its queue.
    const profile = cpuProfiles[s.difficulty];
    let cpuIncoming = s.cpuIncoming.slice();
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
        recentlyResolved = [active, ...recentlyResolved].slice(0, 8);
      }
    }

    set({
      cpuIncoming,
      cpuScore,
      recentlyResolved,
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
        recentlyResolved = [puzzle, ...recentlyResolved].slice(0, 8);
        solvedPuzzleIds.push(puzzle.id);
      }
    }

    set({
      playerIncoming: [...s.playerIncoming],
      playerScore,
      recentlyResolved,
    });
    return { solvedPuzzleIds };
  },

  toMatchState() {
    const s = get();
    const now = Date.now();
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
          tokens: 0,
          connected: true,
        },
        {
          id: s.cpuId,
          name: `CPU (${s.difficulty})`,
          score: s.cpuScore,
          tokens: 0,
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

function createSharedPuzzles(playerId: PlayerId, words: string[], now: number): CpuPuzzle[] {
  return words.map((answer) => ({
    id: PUZZLE_ID_FACTORY(),
    fromPlayerId: playerId,
    toPlayerId: playerId,
    answer,
    guesses: [],
    status: "active",
    startedAt: now,
  }));
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
