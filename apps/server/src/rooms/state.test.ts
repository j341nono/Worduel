import { describe, expect, it } from "vitest";
import type { PlayerId } from "@worduel/shared";
import {
  addPlayer,
  createRoom,
  finalizeMatch,
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

    const queue = room.incoming.get("b" as PlayerId)!;
    queue[0]!.answer = "cat";
    queue[1]!.answer = "dog";

    // Bob guesses "cat" — solves the first puzzle, second still active.
    const r1 = submitGuess(room, {
      solverId: "b" as PlayerId,
      guess: "cat",
      now: start + 16_000,
    });
    expect(r1.appliedTo.length).toBe(queue.length);
    expect(r1.solvedPuzzleIds.length).toBe(1);

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
    const puzzle = room.incoming.get("b" as PlayerId)![0]!;
    puzzle.answer = "cat";

    for (const w of ["dog", "bat", "rat", "ham", "yak"]) {
      submitGuess(room, { solverId: "b" as PlayerId, guess: w, now: start + 6_000 });
    }
    expect(puzzle.status).toBe("active");
    expect(puzzle.guesses.length).toBe(5);
  });

  it("creates the same answer set for both players and resets state on rematch", () => {
    const room = createRoom(p("a", "Alice"), "ROOM03");
    addPlayer(room, p("b", "Bob"));
    const start = 1_000_000;
    startMatch(room, start);

    const firstMatchId = room.matchId;
    const aliceAnswers = room.incoming.get("a" as PlayerId)!.map((p) => p.answer);
    const bobAnswers = room.incoming.get("b" as PlayerId)!.map((p) => p.answer);
    expect(aliceAnswers).toEqual(bobAnswers);

    room.players[0]!.score = 99;
    room.recentlyResolved.push(room.incoming.get("a" as PlayerId)![0]!);
    finalizeMatch(room, start + 60_000);
    startMatch(room, start + 70_000);

    expect(room.matchId).not.toBe(firstMatchId);
    expect(room.players.map((p) => p.score)).toEqual([0, 0]);
    expect(room.recentlyResolved).toEqual([]);
    expect(room.incoming.get("a" as PlayerId)!.every((p) => p.status === "active")).toBe(true);
  });

  it("expires remaining active puzzles at match end without sender bonus", () => {
    const room = createRoom(p("a", "Alice"), "ROOM04");
    addPlayer(room, p("b", "Bob"));
    const start = 1_000_000;
    startMatch(room, start);
    const summary = finalizeMatch(room, start + 60_000);
    expect(room.players[0]!.score).toBe(0);
    expect(room.players[1]!.score).toBe(0);
    expect(summary.winnerPlayerId).toBeNull();
  });
});
