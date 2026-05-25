# Worduel

[日本語版はこちら](README_ja.md)

Worduel is a 60-second, 1-on-1 real-time word duel. Players spend tokens to send
3-letter Wordle-style puzzles to each other, while also solving every active puzzle
sent by the opponent. One guess is applied to all active puzzle slots at once.

This repository is an MVP monorepo with a Next.js client, a Fastify + Socket.IO
match server, shared TypeScript game rules, optional PostgreSQL persistence, and
Vitest coverage for the rules engine.

## Tech stack

- **Frontend**: Next.js 14 App Router, React 18, Tailwind CSS, Zustand, socket.io-client
- **Backend**: Node.js, Fastify, Socket.IO, Prisma
- **Optional persistence**: PostgreSQL
- **Prepared but not active**: Redis / ioredis helpers exist, but room state is currently in memory
- **Shared code**: pnpm workspace TypeScript packages
- **Tests**: Vitest

## Project layout

```text
apps/
  web/              Next.js client: home, CPU battle, online room
  server/           Fastify + Socket.IO authoritative match server
packages/
  game-core/        Pure game rules: feedback, scoring, tokens, validation, CPU helpers
  shared/           Shared TypeScript types and socket contracts
  word-dictionary/  3-letter word list and helpers
```

## Local development

Prerequisites:

- Node.js 20+
- pnpm 9+
- Docker, only if you want local PostgreSQL persistence

Setup:

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

For online play without saved match history, set this in `apps/server/.env`:

```bash
ENABLE_PERSISTENCE=false
```

If you want local PostgreSQL persistence:

```bash
docker compose up -d
pnpm db:push
```

Run both apps:

```bash
pnpm dev
```

Open <http://localhost:3000>.

## Online testing

Same machine:

1. Open <http://localhost:3000> in two browser windows.
2. Create an online room in one window.
3. Join that room code in the other window.
4. Start the match from the host side.

Same LAN:

```bash
# apps/server/.env
CORS_ORIGIN=http://<host-lan-ip>:3000

# apps/web/.env.local
NEXT_PUBLIC_SERVER_URL=http://<host-lan-ip>:4000

pnpm --filter @worduel/server run dev
pnpm --dir apps/web exec next dev -p 3000 -H 0.0.0.0
```

Then open `http://<host-lan-ip>:3000` from each player's device.

## Free hosting notes

The simplest free deployment is:

- **Vercel** for `apps/web`
- **Render** for `apps/server`
- No database for the first online test, with `ENABLE_PERSISTENCE=false`

Vercel settings:

```bash
Root Directory: apps/web
Build Command: pnpm run build
Environment:
  NEXT_PUBLIC_SERVER_URL=https://<your-render-service>.onrender.com
```

Render settings:

```bash
Build Command:
pnpm install --frozen-lockfile && pnpm --filter @worduel/server... run build

Start Command:
pnpm --filter @worduel/server run start

Environment:
NODE_VERSION=20
ENABLE_PERSISTENCE=false
CORS_ORIGIN=https://<your-vercel-app>.vercel.app
```

`render.yaml` also contains the recommended Render service configuration. The server
start script uses `tsx src/index.ts` so it can run against the same workspace
TypeScript packages that the Vercel build consumes.

## Game rules

- A match lasts **60 seconds**.
- Each player earns one question token every **10 seconds**; at most 2 can be stored.
- Spending one token draws 3 candidate words. The sender chooses one and sends it to
  the opponent.
- The receiver has five fixed puzzle slots.
- One 3-letter guess is applied to every active slot simultaneously, so stacked
  puzzles reveal multiple feedback rows from a single try.
- Solved and expired puzzles are shown in the final result screen with their actual
  guesses and feedback.

Scoring:

- Solver: `+10` base, `+5/+3/+1` for solving on guess 1/2/3, plus
  `max(0, 15 - seconds)` speed bonus.
- Sender: `+1` per second the opponent took, including unresolved active puzzles at
  match end.

## Socket events

Defined in `packages/shared/src/socket.ts` and implemented in
`apps/server/src/socket/handlers.ts`.

| Direction | Events |
| --- | --- |
| Client -> Server | `create_room`, `join_room`, `leave_room`, `start_match`, `get_question_candidates`, `send_question`, `submit_guess` |
| Server -> Client | `match_state_updated`, `match_finished`, `player_disconnected`, `error` |

## Useful commands

```bash
pnpm typecheck
pnpm test
pnpm --dir apps/web run build
pnpm --filter @worduel/server... run build
```

## Current limitations

- Guest play only; no sign-up or login flow yet.
- Private rooms only; no public matchmaking queue.
- Room state is in process memory, so a server restart drops active rooms.
- Redis helpers exist but are not currently used for room persistence.
- Reconnection is basic: disconnected players are marked offline, but resumable
  sessions are not implemented.
- Match history persistence is optional and best-effort.
- Spectators are not supported.
- The word dictionary is English-only.
