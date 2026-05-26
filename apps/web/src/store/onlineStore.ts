"use client";
import { create } from "zustand";
import type {
  MatchResultSummary,
  MatchState,
  PlayerId,
  PuzzleId,
} from "@worduel/shared";
import { getSocket } from "@/lib/socket";

let socketHandlersInitialized = false;

interface OnlineStore {
  connected: boolean;
  roomCode: string | null;
  playerId: PlayerId | null;
  state: MatchState | null;
  summary: MatchResultSummary | null;
  toast: { text: string; tone: "info" | "good" | "bad" } | null;

  init: () => void;
  reset: () => void;
  setToast: (t: OnlineStore["toast"]) => void;

  createRoom: (name: string) => Promise<{ roomCode: string; playerId: PlayerId }>;
  joinRoom: (
    roomCode: string,
    name: string,
  ) => Promise<{ playerId: PlayerId; state: MatchState }>;
  leaveRoom: () => Promise<void>;
  startMatch: () => Promise<void>;
  submitGuess: (guess: string) => Promise<{ solvedPuzzleIds: PuzzleId[] }>;
}

export const useOnlineStore = create<OnlineStore>((set, get) => ({
  connected: false,
  roomCode: null,
  playerId: null,
  state: null,
  summary: null,
  toast: null,

  init() {
    if (socketHandlersInitialized) return;
    socketHandlersInitialized = true;
    const socket = getSocket();
    socket.on("connect", () => set({ connected: true }));
    socket.on("disconnect", () => set({ connected: false }));
    socket.on("match_state_updated", (state) =>
      set((current) => {
        const isNewMatch = current.state?.matchId !== state.matchId;
        return {
          state,
          summary: isNewMatch || state.phase === "running" ? null : current.summary,
          toast: isNewMatch ? null : current.toast,
        };
      }),
    );
    socket.on("match_finished", (summary) =>
      set((current) =>
        !current.state || current.state.matchId === summary.matchId ? { summary } : {},
      ),
    );
    socket.on("player_disconnected", () =>
      set({ toast: { text: "Opponent disconnected", tone: "bad" } }),
    );
    socket.on("error", (e) => set({ toast: { text: e.message, tone: "bad" } }));
  },

  reset() {
    set({ roomCode: null, playerId: null, state: null, summary: null, toast: null });
  },

  setToast(t) {
    set({ toast: t });
  },

  createRoom(name) {
    const socket = getSocket();
    return new Promise((resolve, reject) => {
      socket.emit("create_room", { name }, (res) => {
        if (!res.ok) return reject(new Error(res.error));
        set({
          roomCode: res.data.roomCode,
          playerId: res.data.playerId,
          state: null,
          summary: null,
          toast: null,
        });
        resolve(res.data);
      });
    });
  },

  joinRoom(roomCode, name) {
    const socket = getSocket();
    return new Promise((resolve, reject) => {
      socket.emit("join_room", { roomCode, name }, (res) => {
        if (!res.ok) return reject(new Error(res.error));
        set({
          roomCode: roomCode.toUpperCase(),
          playerId: res.data.playerId,
          state: res.data.state,
          summary: null,
          toast: null,
        });
        resolve(res.data);
      });
    });
  },

  leaveRoom() {
    const socket = getSocket();
    return new Promise((resolve) => {
      socket.emit("leave_room", () => {
        get().reset();
        resolve();
      });
    });
  },

  startMatch() {
    const socket = getSocket();
    set({ summary: null, toast: null });
    return new Promise((resolve, reject) => {
      socket.emit("start_match", (res) => {
        if (!res.ok) return reject(new Error(res.error));
        resolve();
      });
    });
  },

  submitGuess(guess) {
    const socket = getSocket();
    return new Promise((resolve, reject) => {
      socket.emit("submit_guess", { guess }, (res) => {
        if (!res.ok) return reject(new Error(res.error));
        resolve({ solvedPuzzleIds: res.data.solvedPuzzleIds });
      });
    });
  },
}));
