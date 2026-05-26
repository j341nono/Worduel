import type { ClientToServerEvents, ServerToClientEvents } from "@worduel/shared";
import type { PlayerId } from "@worduel/shared";
import { validateGuess } from "@worduel/game-core";
import type { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { generateRoomCode } from "../rooms/code.js";
import {
  addPlayer,
  createRoom,
  finalizeMatch,
  snapshot,
  startMatch,
  submitGuess,
} from "../rooms/state.js";
import {
  bindPlayer,
  deleteRoom,
  getRoom,
  roomForPlayer,
  setRoom,
  unbindPlayer,
} from "../rooms/registry.js";
import { persistMatchResult } from "../rooms/persist.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type SocketT = Socket<ClientToServerEvents, ServerToClientEvents>;

// Per-room loop interval handles, so we can clear when the match ends.
const tickHandles = new Map<string, NodeJS.Timeout>();

function broadcast(io: IO, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;
  io.to(roomCode).emit("match_state_updated", snapshot(room, Date.now()));
}

function startTickLoop(io: IO, roomCode: string): void {
  if (tickHandles.has(roomCode)) return;
  const handle = setInterval(() => {
    const room = getRoom(roomCode);
    if (!room) {
      clearInterval(handle);
      tickHandles.delete(roomCode);
      return;
    }
    const now = Date.now();
    if (room.phase === "running") {
      if (room.endsAt !== undefined && now >= room.endsAt) {
        endMatch(io, roomCode).catch(() => {});
        return;
      }
      io.to(roomCode).emit("match_state_updated", snapshot(room, now));
    }
  }, 1000);
  tickHandles.set(roomCode, handle);
}

async function endMatch(io: IO, roomCode: string): Promise<void> {
  const room = getRoom(roomCode);
  if (!room) return;
  const now = Date.now();
  const summary = finalizeMatch(room, now);
  io.to(roomCode).emit("match_state_updated", snapshot(room, now));
  io.to(roomCode).emit("match_finished", summary);
  const handle = tickHandles.get(roomCode);
  if (handle) {
    clearInterval(handle);
    tickHandles.delete(roomCode);
  }
  await persistMatchResult(summary);
}

export function registerSocketHandlers(io: IO): void {
  io.on("connection", (socket: SocketT) => {
    // ---------- create_room ----------
    socket.on("create_room", ({ name }, cb) => {
      try {
        const playerId = nanoid(12) as PlayerId;
        let code = generateRoomCode();
        // Avoid collision on the (rare) chance.
        for (let i = 0; i < 5 && getRoom(code); i++) code = generateRoomCode();

        const room = createRoom(
          {
            id: playerId,
            name: cleanName(name),
            score: 0,
            tokens: 0,
            connected: true,
          },
          code,
        );
        room.socketByPlayer.set(playerId, socket.id);
        setRoom(room);
        bindPlayer(playerId, code);
        socket.join(code);
        socket.data.playerId = playerId;
        socket.data.roomCode = code;
        cb({ ok: true, data: { roomCode: code, playerId } });
        broadcast(io, code);
      } catch (err) {
        cb({ ok: false, error: (err as Error).message });
      }
    });

    // ---------- join_room ----------
    socket.on("join_room", ({ roomCode, name }, cb) => {
      try {
        const code = roomCode.toUpperCase();
        const room = getRoom(code);
        if (!room) throw new Error("Room not found");
        if (room.players.length >= 2) throw new Error("Room is full");
        if (room.phase !== "lobby") throw new Error("Match already started");

        const playerId = nanoid(12) as PlayerId;
        addPlayer(room, {
          id: playerId,
          name: cleanName(name),
          score: 0,
          tokens: 0,
          connected: true,
        });
        room.socketByPlayer.set(playerId, socket.id);
        bindPlayer(playerId, code);
        socket.join(code);
        socket.data.playerId = playerId;
        socket.data.roomCode = code;

        const state = snapshot(room, Date.now());
        cb({ ok: true, data: { playerId, state } });
        broadcast(io, code);
      } catch (err) {
        cb({ ok: false, error: (err as Error).message });
      }
    });

    // ---------- leave_room ----------
    socket.on("leave_room", (cb) => {
      try {
        leaveRoom(io, socket);
        cb?.({ ok: true, data: { left: true } });
      } catch (err) {
        cb?.({ ok: false, error: (err as Error).message });
      }
    });

    // ---------- start_match ----------
    socket.on("start_match", (cb) => {
      try {
        const room = currentRoom(socket);
        startMatch(room, Date.now());
        cb({ ok: true, data: { started: true } });
        broadcast(io, room.roomCode);
        startTickLoop(io, room.roomCode);
      } catch (err) {
        cb({ ok: false, error: (err as Error).message });
      }
    });

    // ---------- get_question_candidates ----------
    socket.on("get_question_candidates", (cb) => {
      try {
        currentRoom(socket);
        throw new Error("Manual question sending is disabled for shared-word matches");
      } catch (err) {
        cb({ ok: false, error: (err as Error).message });
      }
    });

    // ---------- send_question ----------
    socket.on("send_question", ({ candidateId }, cb) => {
      try {
        currentRoom(socket);
        void candidateId;
        throw new Error("Manual question sending is disabled for shared-word matches");
      } catch (err) {
        cb({ ok: false, error: (err as Error).message });
      }
    });

    // ---------- submit_guess ----------
    socket.on("submit_guess", ({ guess }, cb) => {
      try {
        const room = currentRoom(socket);
        const playerId = socket.data.playerId as PlayerId;
        const v = validateGuess(guess);
        if (!v.ok) {
          cb({ ok: false, error: v.reason === "shape" ? "Invalid shape" : "Not in dictionary" });
          return;
        }
        const result = submitGuess(room, {
          solverId: playerId,
          guess: v.word,
          now: Date.now(),
        });
        cb({
          ok: true,
          data: { accepted: true, solvedPuzzleIds: result.solvedPuzzleIds },
        });
        broadcast(io, room.roomCode);
      } catch (err) {
        cb({ ok: false, error: (err as Error).message });
      }
    });

    // ---------- disconnect ----------
    socket.on("disconnect", () => {
      try {
        const playerId = socket.data.playerId as PlayerId | undefined;
        if (!playerId) return;
        const room = roomForPlayer(playerId);
        if (!room) return;
        const player = room.players.find((p) => p.id === playerId);
        if (player) player.connected = false;
        io.to(room.roomCode).emit("player_disconnected", { playerId });
        broadcast(io, room.roomCode);
      } catch {
        // ignore
      }
    });
  });
}

function currentRoom(socket: SocketT) {
  const code = socket.data.roomCode as string | undefined;
  if (!code) throw new Error("Not in a room");
  const room = getRoom(code);
  if (!room) throw new Error("Room missing");
  return room;
}

function cleanName(input: string): string {
  const trimmed = (input ?? "").toString().trim();
  if (!trimmed) return "Guest";
  return trimmed.slice(0, 20);
}

function leaveRoom(io: IO, socket: SocketT): void {
  const code = socket.data.roomCode as string | undefined;
  const playerId = socket.data.playerId as PlayerId | undefined;
  if (!code || !playerId) return;
  const room = getRoom(code);
  if (!room) return;

  socket.leave(code);
  unbindPlayer(playerId);
  room.players = room.players.filter((p) => p.id !== playerId);
  room.socketByPlayer.delete(playerId);
  room.incoming.delete(playerId);
  socket.data.playerId = undefined;
  socket.data.roomCode = undefined;

  if (room.players.length === 0) {
    const handle = tickHandles.get(code);
    if (handle) {
      clearInterval(handle);
      tickHandles.delete(code);
    }
    deleteRoom(code);
  } else {
    broadcast(io, code);
  }
}
