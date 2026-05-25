# Worduel

A 60-second, 1-on-1 real-time word duel. Spend tokens to send your opponent a 3-letter
word puzzle. Race to solve theirs first. Highest score when the clock hits zero wins.

This repo contains an MVP build: monorepo, Next.js frontend, Fastify + Socket.IO
backend, shared TypeScript game core, PostgreSQL persistence, Redis for runtime state,
and Vitest tests for the rules engine.

## Tech stack

- **Frontend**: Next.js 14 (App Router) · React 18 · Tailwind CSS · Zustand · socket.io-client
- **Backend**: Node.js · Fastify · Socket.IO · ioredis · Prisma
- **Database**: PostgreSQL 16
- **Realtime store**: Redis 7
- **Shared code**: TypeScript packages
- **Tests**: Vitest
- **Tooling**: pnpm workspaces

## Project layout

```
apps/
  web/          Next.js client (home / CPU battle / online room)
  server/       Fastify + Socket.IO authoritative match server
packages/
  game-core/    Pure game rules: feedback, scoring, tokens, validation, CPU helpers
  shared/       Shared TypeScript types (socket events, match state, player/puzzle)
  word-dictionary/  3-letter word list and helpers
prisma is colocated under apps/server/prisma
```

## Local development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL and Redis)

### One-time setup

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d
pnpm db:push        # creates Prisma client + pushes schema to Postgres
```

### Run the apps

```bash
pnpm dev            # runs apps/web (3000) and apps/server (4000) in parallel
```

Then open http://localhost:3000.

### Online battle test / hosting

For a same-machine smoke test, open two browser windows at http://localhost:3000,
create a room in one window, join that room code in the other, then start the match.

For another device on the same LAN:

```bash
# apps/server/.env
CORS_ORIGIN=http://<host-lan-ip>:3000

# apps/web/.env.local
NEXT_PUBLIC_SERVER_URL=http://<host-lan-ip>:4000

pnpm --filter @worduel/server run dev
pnpm --dir apps/web exec next dev -p 3000 -H 0.0.0.0
```

Then open `http://<host-lan-ip>:3000` from both players' devices. Make sure ports
3000 and 4000 are reachable through the host firewall.

For internet testing, put both apps behind public HTTPS endpoints. The web app needs
`NEXT_PUBLIC_SERVER_URL=https://<api-host>`, and the server needs
`CORS_ORIGIN=https://<web-host>`. Socket.IO will use secure WebSockets through that
same API host. Keep PostgreSQL and Redis private; only expose the web/API endpoints.

Recommended free-host settings:

```bash
# Vercel web build command
pnpm run build

# Render server build command
pnpm install --frozen-lockfile && pnpm --filter @worduel/server... run build

# Render server start command
pnpm --filter @worduel/server run start
```

The server start script uses `tsx src/index.ts` so Render can run against the
workspace TypeScript packages that are also consumed by the Vercel build.

### Tests

```bash
pnpm test           # runs Vitest across all packages
```

## How to play (MVP rules)

- A match is **60 seconds** of 1v1.
- Every **10 seconds**, each player earns a **question token** (max 2 stored).
- Spend a token to draw 3 candidate words from the server and send one to the opponent.
- The opponent sees five fixed Wordle-style slots. One 3-letter guess is applied to
  every active slot at once, so stacked puzzles reveal multiple feedback rows from a
  single try (`correct` · `present` · `absent`).
- Scoring (see `packages/game-core/src/scoring.ts`):
  - Solver: +10 base, +5/+3/+1 by guess number, +max(0, 15 − sec) speed bonus
  - Sender: +1 per second the opponent took, including unresolved active puzzles at match end

The server is authoritative for state, scoring, timing and word validation.

## Socket events

Implemented in `apps/server/src/socket/handlers.ts`, typed in
`packages/shared/src/socket.ts`:

| Direction | Event |
| --- | --- |
| C→S | `create_room`, `join_room`, `leave_room`, `start_match`, `get_question_candidates`, `send_question`, `submit_guess` |
| S→C | `match_state_updated`, `match_finished`, `player_disconnected`, `error` |

## Database schema (Prisma)

`apps/server/prisma/schema.prisma` defines `User`, `Match`, and `MatchPlayer`.
`MatchPlayer.userId` is optional so the MVP can save guest matches without auth.

## Remaining TODOs / Limitations

- **Auth**: guests only. The `User` table exists; sign-up/login flows are not built.
- **Matchmaking**: only private rooms via code. No public queue.
- **Redis usage**: the server keeps room state in-process for the MVP. A future task
  is to snapshot rooms into Redis and reconnect on the same room across instances.
- **Reconnection**: a disconnected player marks `connected=false` and the match keeps
  going. There's no resumable session token yet.
- **Persistence completeness**: completed matches are written to Postgres, but the
  `winnerId` field is left null because the MatchPlayer ids are generated by Prisma
  in the same transaction; backfilling the winner reference is a follow-up.
- **Spectators**: not supported.
- **Internationalization**: dictionary is English-only.
- **Anti-abuse**: rate-limiting and basic input sanitization are minimal.

## Notes

- The 3-letter word list is curated (250+ common words) and lives in
  `packages/word-dictionary/src/words.ts`. Replace at will.
- All game rules are pure functions in `packages/game-core` and have Vitest coverage.
  Both the client (CPU mode) and the server import them, so behavior stays in sync.
