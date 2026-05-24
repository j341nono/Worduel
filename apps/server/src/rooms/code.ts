import { ROOM_CODE_LENGTH } from "@worduel/shared";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ambiguous chars removed

export function generateRoomCode(): string {
  let out = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
