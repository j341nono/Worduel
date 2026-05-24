import { describe, expect, it } from "vitest";
import type { PlayerId } from "@worduel/shared";
import {
  addPlayer,
  createRoom,
  finalizeMatch,
  sendQuestion,
  snapshot,
  startMatch,
  submitGuess,
} from "./state.js";

function p(id: string, name: string) {
  return { id: id as PlayerId, name, score: 0, tokens: 0, connected: true };
}

describe("room state", () => {
  it("applies one guess to all of the solver's active puzzles", () => {
    const room = createRoom(p("a", "Alice"), "ROOM01");
    addPlayer(room, p("b", "Bob"));
    const start = 1_000_000;
    startMatch(room, start);
    snapshot(room, start + 15_000); // Alice has 2 tokens at t=15

    // Alice sends two puzzles to Bob: "cat" and "dog".
    sendQuestion(room, { senderId: "a" as PlayerId, answer: "cat", now: start + 15_000 });
    sendQuestion(room, { senderId: "a" as PlayerId, answer: "dog", now: start + 15_500 });

    // Bob guesses "cat" — solves the first puzzle, second still active.
    const r1 = submitGuess(room, {
      solverId: "b" as PlayerId,
      guess: "cat",
      now: start + 16_000,
    });
    expect(r1.appliedTo.length).toBe(2);
    expect(r1.solvedPuzzleIds.length).toBe(1);

    const queue = room.incoming.get("b" as PlayerId)!;
    expect(queue.find((p) => p.answer === "cat")!.status).toBe("solved");
    expect(queue.find((p) => p.answer === "dog")!.status).toBe("active");
    // Both puzzles now have 1 guess recorded.
    expect(queue.find((p) => p.answer === "dog")!.guesses.length).toBe(1);
  });

  it("never caps guess count — unlimited attempts remain valid", () => {
    const room = createRoom(p("a", "Alice"), "ROOM02");
    addPlayer(room, p("b", "Bob"));
    const start = 1_000_000;
    startMatch(room, start);
    snapshot(room, start + 5_000);
    sendQuestion(room, { senderId: "a" as PlayerId, answer: "cat", now: start + 5_000 });

    for (const w of ["dog", "bat", "rat", "ham", "yak"]) {
      submitGuess(room, { solverId: "b" as PlayerId, guess: w, now: start + 6_000 });
    }
    const puzzle = room.incoming.get("b" as PlayerId)!.find((p) => p.answer === "cat")!;
    expect(puzzle.status).toBe("active");
    expect(puzzle.guesses.length).toBe(5);
  });

  it("expires remaining active puzzles at match end with time bonus only", () => {
    const room = createRoom(p("a", "Alice"), "ROOM03");
    addPlayer(room, p("b", "Bob"));
    const start = 1_000_000;
    startMatch(room, start);
    snapshot(room, start + 5_000);
    sendQuestion(room, { senderId: "a" as PlayerId, answer: "cat", now: start + 5_000 });
    const summary = finalizeMatch(room, start + 60_000);
    expect(room.players[0]!.score).toBe(55); // sender time bonus 55s
    expect(summary.winnerPlayerId).toBe("a");
  });
});
