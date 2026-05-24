import type { MatchResultSummary } from "@worduel/shared";
import { env } from "../env.js";
import { getPrisma } from "../db.js";

export async function persistMatchResult(summary: MatchResultSummary): Promise<void> {
  if (!env.ENABLE_PERSISTENCE) return;
  if (!env.DATABASE_URL) return;
  try {
    const prisma = getPrisma();
    await prisma.match.create({
      data: {
        id: summary.matchId,
        roomCode: summary.roomCode,
        startedAt: new Date(summary.startedAt),
        endedAt: new Date(summary.endedAt),
        winnerId: null, // we set after creating the MatchPlayers
        players: {
          create: summary.players.map((p) => ({
            guestName: p.name,
            score: p.score,
            isCpu: Boolean(p.isCpu),
          })),
        },
      },
    });
  } catch (err) {
    // Persistence is best-effort for MVP.
    // eslint-disable-next-line no-console
    console.warn("[persist] match save failed:", (err as Error).message);
  }
}
