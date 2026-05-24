import type {
  MatchResultSummary,
  MatchState,
  PlayerId,
  PuzzleId,
  QuestionCandidate,
} from "./game.js";

// Standard ack envelope returned by request-style emits.
export interface Ack<T> {
  ok: true;
  data: T;
}
export interface AckError {
  ok: false;
  error: string;
}
export type AckResponse<T> = Ack<T> | AckError;

// Client -> Server events.
export interface ClientToServerEvents {
  create_room: (
    payload: { name: string },
    cb: (res: AckResponse<{ roomCode: string; playerId: PlayerId }>) => void,
  ) => void;

  join_room: (
    payload: { roomCode: string; name: string },
    cb: (res: AckResponse<{ playerId: PlayerId; state: MatchState }>) => void,
  ) => void;

  leave_room: (cb?: (res: AckResponse<{ left: true }>) => void) => void;

  start_match: (cb: (res: AckResponse<{ started: true }>) => void) => void;

  get_question_candidates: (
    cb: (res: AckResponse<{ candidates: QuestionCandidate[] }>) => void,
  ) => void;

  send_question: (
    payload: { candidateId: string },
    cb: (res: AckResponse<{ puzzleId: PuzzleId }>) => void,
  ) => void;

  // A single guess is broadcast against ALL of the player's currently active puzzles.
  // Each puzzle records its own feedback for the same word, and any that match the
  // answer are immediately resolved and locked in their slot.
  submit_guess: (
    payload: { guess: string },
    cb: (
      res: AckResponse<{
        accepted: boolean;
        solvedPuzzleIds: PuzzleId[];
      }>,
    ) => void,
  ) => void;
}

// Server -> Client events.
export interface ServerToClientEvents {
  match_state_updated: (state: MatchState) => void;
  match_finished: (summary: MatchResultSummary) => void;
  player_disconnected: (payload: { playerId: PlayerId }) => void;
  error: (payload: { message: string; code?: string }) => void;
}

export type SocketEventName =
  | keyof ClientToServerEvents
  | keyof ServerToClientEvents;
