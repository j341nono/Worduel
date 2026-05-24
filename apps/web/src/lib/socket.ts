"use client";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@worduel/shared";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket && socket.connected) return socket;
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";
    socket = io(url, { autoConnect: true, transports: ["websocket", "polling"] });
  }
  return socket;
}

export function emit<EV extends keyof ClientToServerEvents>(
  ev: EV,
  ...args: Parameters<ClientToServerEvents[EV]>
): void {
  const s = getSocket();
  (s.emit as any)(ev, ...args);
}
