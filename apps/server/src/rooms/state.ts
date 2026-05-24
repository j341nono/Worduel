import { CANDIDATE_COUNT, MATCH_DURATION_SEC } from "@worduel/shared";
import type {
  MatchId,
  MatchPhase,
  MatchResultSummary,
  MatchState,
  PlayerId,
  PlayerState,
  Puzzle,
  PuzzleId,
  QuestionCandidate,
} from "@worduel/shared";
import {
  computeFeedback,
  computeTokenCount,
  isAllCorrect,
  scoreMatchEndExpire,
  scoreSolve,
} from "@worduel/game-core";
import { sampleWords } from "@worduel/word-dictionary";
import { nanoid } from "nanoid";

export interface ServerRoom {
  matchId: MatchId;
  roomCode: string;
  phase: MatchPhase;
  players: ServerPlayer[];
  startedAt?: number;
  endsAt?: number;
  // Per-player slots: the receiver's full timeline of puzzles. Solved puzzles stay in
  // place (locked) — they are not removed, so the UI can render fixed slot positions.
  incoming: Map<PlayerId, ServerPuzzle[]>;
  recentlyResolved: ServerPuzzle[];
  candidates: Map<PlayerId, QuestionCandidate[]>;
  tokensSpent: Map<PlayerId, number>;
  socketByPlayer: Map<PlayerId, string>;
  finalSummary?: MatchResultSummary;
}

export interface ServerPlayer extends PlayerState {}

export interface ServerPuzzle extends Puzzle {
  answer: string; // always present server-side
}

export function createRoom(initialPlayer: ServerPlayer, roomCode: string): ServerRoom {
  const matchId = nanoid() as MatchId;
  return {
    matchId,
    roomCode,
    phase: "lobby",
    players: [initialPlayer],
    incoming: new Map([[initialPlayer.id, []]]),
    recentlyResolved: [],
    candidates: new Map(),
    tokensSpent: new Map([[initialPlayer.id, 0]]),
    socketByPlayer: new Map(),
  };
}

export function addPlayer(room: ServerRoom, player: ServerPlayer): void {
  if (room.players.length >= 2) throw new Error("Room is full");
  room.players.push(player);
  room.incoming.set(player.id, []);
  room.tokensSpent.set(player.id, 0);
}

export function startMatch(room: ServerRoom, now: number): void {
  if (room.players.length !== 2) throw new Error("Need 2 players to start");
  room.phase = "running";
  room.startedAt = now;
  room.endsAt = now + MATCH_DURATION_SEC * 1000;
}

export function snapshot(room: ServerRoom, now: number): MatchState {
  for (const p of room.players) {
    if (room.phase === "running" && room.startedAt) {
      p.tokens = computeTokenCount({
        matchStartMs: room.startedAt,
        nowMs: now,
        tokensSpent: room.tokensSpent.get(p.id) ?? 0,
      });
    }
  }

  const incomingObj: Record<PlayerId, Puzzle[]> = {} as Record<PlayerId, Puzzle[]>;
  for (const p of room.players) {
    incomingObj[p.id] = (room.incoming.get(p.id) ?? []).map(toClientPuzzle);
  }

  return {
    matchId: room.matchId,
    roomCode: room.roomCode,
    phase: room.phase,
    ...(room.startedAt !== undefined ? { startedAt: room.startedAt } : {}),
    ...(room.endsAt !== undefined ? { endsAt: room.endsAt } : {}),
    serverNow: now,
    players: room.players.map((p) => ({ ...p })),
    incoming: incomingObj,
    recentlyResolved: room.recentlyResolved.map(toClientPuzzle),
  };
}

function toClientPuzzle(p: ServerPuzzle): Puzzle {
  if (p.status === "active") {
    const { answer: _omit, ...rest } = p;
    return rest;
  }
  return { ...p };
}

export function generateCandidates(): QuestionCandidate[] {
  const words = sampleWords(CANDIDATE_COUNT);
  return words.map((w) => ({ id: nanoid(8), word: w }));
}

export interface SendQuestionInput {
  senderId: PlayerId;
  answer: string;
  now: number;
}

export function sendQuestion(room: ServerRoom, input: SendQuestionInput): ServerPuzzle {
  if (room.phase !== "running") throw new Error("Match is not running");
  const sender = room.players.find((p) => p.id === input.senderId);
  if (!sender) throw new Error("Sender not in room");
  const opponent = room.players.find((p) => p.id !== input.senderId);
  if (!opponent) throw new Error("Opponent missing");

  if (sender.tokens <= 0) throw new Error("No question tokens available");

  room.tokensSpent.set(input.senderId, (room.tokensSpent.get(input.senderId) ?? 0) + 1);
  sender.tokens = Math.max(0, sender.tokens - 1);

  const puzzle: ServerPuzzle = {
    id: nanoid(10) as PuzzleId,
    fromPlayerId: input.senderId,
    toPlayerId: opponent.id,
    answer: input.answer,
    guesses: [],
    status: "active",
    startedAt: input.now,
  };

  const queue = room.incoming.get(opponent.id) ?? [];
  queue.push(puzzle);
  room.incoming.set(opponent.id, queue);

  return puzzle;
}

export interface SubmitGuessInput {
  solverId: PlayerId;
  guess: string;
  now: number;
}

export interface SubmitGuessResult {
  appliedTo: PuzzleId[];
  solvedPuzzleIds: PuzzleId[];
}

/**
 * Apply a single guess to ALL of the solver's currently active puzzles. Each puzzle
 * records its own feedback for the same word; any puzzle whose answer matches gets
 * locked as "solved" in place (the slot remains for visual continuity).
 */
export function submitGuess(room: ServerRoom, input: SubmitGuessInput): SubmitGuessResult {
  if (room.phase !== "running") throw new Error("Match is not running");
  const queue = room.incoming.get(input.solverId);
  if (!queue) throw new Error("Player not in room");
  const activePuzzles = queue.filter((p) => p.status === "active");
  if (activePuzzles.length === 0) {
    return { appliedTo: [], solvedPuzzleIds: [] };
  }

  const appliedTo: PuzzleId[] = [];
  const solvedPuzzleIds: PuzzleId[] = [];

  for (const puzzle of activePuzzles) {
    const feedback = computeFeedback(input.guess, puzzle.answer);
    puzzle.guesses.push({ guess: input.guess, feedback, submittedAt: input.now });
    appliedTo.push(puzzle.id);

    if (isAllCorrect(feedback)) {
      puzzle.status = "solved";
      puzzle.resolvedAt = input.now;
      const guessNumber = puzzle.guesses.length;
      const elapsedMs = input.now - puzzle.startedAt;
      const r = scoreSolve({ guessNumber, elapsedMs });
      awardPoints(room, puzzle.toPlayerId, r.solverPoints);
      awardPoints(room, puzzle.fromPlayerId, r.senderPoints);
      room.recentlyResolved.unshift(puzzle);
      if (room.recentlyResolved.length > 8) room.recentlyResolved.length = 8;
      solvedPuzzleIds.push(puzzle.id);
    }
  }

  return { appliedTo, solvedPuzzleIds };
}

function awardPoints(room: ServerRoom, playerId: PlayerId, points: number): void {
  const p = room.players.find((x) => x.id === playerId);
  if (p) p.score += points;
}

export function finalizeMatch(room: ServerRoom, now: number): MatchResultSummary {
  room.phase = "finished";

  for (const [, puzzles] of room.incoming) {
    for (const p of puzzles) {
      if (p.status !== "active") continue;
      p.status = "expired";
      p.resolvedAt = now;
      const elapsedMs = now - p.startedAt;
      const { senderPoints } = scoreMatchEndExpire({ elapsedMs });
      awardPoints(room, p.fromPlayerId, senderPoints);
      room.recentlyResolved.unshift(p);
    }
  }
  if (room.recentlyResolved.length > 8) room.recentlyResolved.length = 8;

  const [a, b] = room.players;
  if (!a || !b) throw new Error("Finalize called without 2 players");
  const winner = a.score === b.score ? null : a.score > b.score ? a.id : b.id;

  const summary: MatchResultSummary = {
    matchId: room.matchId,
    roomCode: room.roomCode,
    startedAt: room.startedAt ?? now,
    endedAt: now,
    players: room.players.map((p) => ({
      playerId: p.id,
      name: p.name,
      score: p.score,
      ...(p.isCpu ? { isCpu: true } : {}),
    })),
    winnerPlayerId: winner,
  };
  room.finalSummary = summary;
  return summary;
}
