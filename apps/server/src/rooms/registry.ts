import type { ServerRoom } from "./state.js";

// Single-process in-memory registry. Redis is the cross-instance store
// for snapshots/locks but for the MVP we run a single server instance.
const rooms = new Map<string, ServerRoom>();
const playerToRoom = new Map<string, string>();

export function getRoom(code: string): ServerRoom | undefined {
  return rooms.get(code);
}

export function setRoom(room: ServerRoom): void {
  rooms.set(room.roomCode, room);
}

export function deleteRoom(code: string): void {
  const r = rooms.get(code);
  if (r) {
    for (const p of r.players) playerToRoom.delete(p.id);
  }
  rooms.delete(code);
}

export function bindPlayer(playerId: string, code: string): void {
  playerToRoom.set(playerId, code);
}

export function roomForPlayer(playerId: string): ServerRoom | undefined {
  const code = playerToRoom.get(playerId);
  return code ? rooms.get(code) : undefined;
}

export function unbindPlayer(playerId: string): void {
  playerToRoom.delete(playerId);
}

export function allRooms(): ServerRoom[] {
  return Array.from(rooms.values());
}
