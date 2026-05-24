import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

let _prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({
      datasources: env.DATABASE_URL
        ? { db: { url: env.DATABASE_URL } }
        : undefined,
    });
  }
  return _prisma;
}
