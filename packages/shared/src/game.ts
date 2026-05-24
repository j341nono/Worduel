// ----- Branded ids -----
export type PlayerId = string & { readonly __brand: "PlayerId" };
export type PuzzleId = string & { readonly __brand: "PuzzleId" };
export type MatchId = string & { readonly __brand: "MatchId" };

// ----- Letter feedback -----
export type LetterFeedback = "correct" | "present" | "absent";

export interface LetterResult {
  letter: string; // lowercase a-z
  feedback: LetterFeedback;
}

export type GuessFeedback = LetterResult[]; // length === WORD_LENGTH

// ----- Question candidates -----
export interface QuestionCandidate {
  id: string;
  word: string;
}

// ----- Puzzle (a question sent to one player) -----
// Active puzzles persist until the receiver either solves them, exhausts their guesses,
// or the match ends. There is no per-puzzle timer.
export type PuzzleStatus = "active" | "solved" | "failed" | "expired";

export interface GuessRecord {
  guess: string;
  feedback: GuessFeedback;
  submittedAt: number; // epoch ms
}

export interface Puzzle {
  id: PuzzleId;
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  // The answer is omitted in client-bound payloads while active; revealed when status !== "active".
  answer?: string;
  guesses: GuessRecord[];
  status: PuzzleStatus;
  startedAt: number; // epoch ms
  resolvedAt?: number; // epoch ms when solved/failed/expired
}

// ----- Player state -----
export interface PlayerState {
  id: PlayerId;
  name: string;
  score: number;
  tokens: number; // unspent question tokens
  connected: boolean;
  isCpu?: boolean;
}

// ----- Match state (broadcast snapshot) -----
export type MatchPhase = "lobby" | "running" | "finished";

export interface MatchState {
  matchId: MatchId;
  roomCode: string;
  phase: MatchPhase;
  startedAt?: number; // epoch ms
  endsAt?: number; // epoch ms
  serverNow: number; // epoch ms when this snapshot was assembled
  players: PlayerState[]; // index 0 / 1
  // Puzzles directed *at* each player (i.e., incoming queue for that player).
  incoming: Record<PlayerId, Puzzle[]>;
  // The most recently resolved puzzles (for "result toast" UX). Capped on the server.
  recentlyResolved: Puzzle[];
}

// ----- Result summary persisted at end of match -----
export interface MatchPlayerResult {
  playerId: PlayerId;
  name: string;
  score: number;
  isCpu?: boolean;
}

export interface MatchResultSummary {
  matchId: MatchId;
  roomCode: string;
  startedAt: number;
  endedAt: number;
  players: MatchPlayerResult[];
  winnerPlayerId: PlayerId | null; // null on draw
}
