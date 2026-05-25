# Worduel

[English](#english) | [日本語](#日本語)

---

## English

Worduel is a 60-second, 1-on-1 real-time word duel. Players spend tokens to send
3-letter Wordle-style puzzles to each other, while also solving every active puzzle
sent by the opponent. One guess is applied to all active puzzle slots at once.

This repository is an MVP monorepo with a Next.js client, a Fastify + Socket.IO
match server, shared TypeScript game rules, optional PostgreSQL persistence, and
Vitest coverage for the rules engine.

### Tech stack

- **Frontend**: Next.js 14 App Router, React 18, Tailwind CSS, Zustand, socket.io-client
- **Backend**: Node.js, Fastify, Socket.IO, Prisma
- **Optional persistence**: PostgreSQL
- **Prepared but not active**: Redis / ioredis helpers exist, but room state is currently in memory
- **Shared code**: pnpm workspace TypeScript packages
- **Tests**: Vitest

### Project layout

```text
apps/
  web/              Next.js client: home, CPU battle, online room
  server/           Fastify + Socket.IO authoritative match server
packages/
  game-core/        Pure game rules: feedback, scoring, tokens, validation, CPU helpers
  shared/           Shared TypeScript types and socket contracts
  word-dictionary/  3-letter word list and helpers
```

### Local development

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

### Online testing

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

### Free hosting notes

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

### Game rules

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

### Socket events

Defined in `packages/shared/src/socket.ts` and implemented in
`apps/server/src/socket/handlers.ts`.

| Direction | Events |
| --- | --- |
| Client -> Server | `create_room`, `join_room`, `leave_room`, `start_match`, `get_question_candidates`, `send_question`, `submit_guess` |
| Server -> Client | `match_state_updated`, `match_finished`, `player_disconnected`, `error` |

### Useful commands

```bash
pnpm typecheck
pnpm test
pnpm --dir apps/web run build
pnpm --filter @worduel/server... run build
```

### Current limitations

- Guest play only; no sign-up or login flow yet.
- Private rooms only; no public matchmaking queue.
- Room state is in process memory, so a server restart drops active rooms.
- Redis helpers exist but are not currently used for room persistence.
- Reconnection is basic: disconnected players are marked offline, but resumable
  sessions are not implemented.
- Match history persistence is optional and best-effort.
- Spectators are not supported.
- The word dictionary is English-only.

---

## 日本語

Worduel は、60秒で勝敗が決まる 1対1 のリアルタイム単語対戦ゲームです。プレイヤーは
トークンを使って相手に3文字の Wordle 風パズルを送りつつ、相手から届いた複数の
パズルを同時に解きます。1回の解答入力は、進行中のすべてのパズルスロットへ同時に
適用されます。

このリポジトリは MVP の monorepo です。Next.js クライアント、Fastify + Socket.IO
対戦サーバー、共有 TypeScript ゲームルール、任意の PostgreSQL 永続化、ルールエンジン
向けの Vitest テストを含みます。

### 技術スタック

- **フロントエンド**: Next.js 14 App Router, React 18, Tailwind CSS, Zustand, socket.io-client
- **バックエンド**: Node.js, Fastify, Socket.IO, Prisma
- **任意の永続化**: PostgreSQL
- **準備済みだが未使用**: Redis / ioredis の helper はありますが、現在のルーム状態はメモリ上で管理しています
- **共有コード**: pnpm workspace の TypeScript packages
- **テスト**: Vitest

### ディレクトリ構成

```text
apps/
  web/              Next.js クライアント: ホーム、CPU対戦、オンラインルーム
  server/           Fastify + Socket.IO の権威サーバー
packages/
  game-core/        feedback、scoring、tokens、validation、CPU helper などの純粋なゲームルール
  shared/           共有 TypeScript 型と Socket.IO contract
  word-dictionary/  3文字単語リストと helper
```

### ローカル開発

必要なもの:

- Node.js 20+
- pnpm 9+
- Docker。ローカルで PostgreSQL 永続化を使う場合のみ必要です。

セットアップ:

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

試合履歴を保存せずオンライン対戦だけ試す場合は、`apps/server/.env` に設定します。

```bash
ENABLE_PERSISTENCE=false
```

ローカル PostgreSQL へ試合履歴を保存したい場合:

```bash
docker compose up -d
pnpm db:push
```

両方のアプリを起動:

```bash
pnpm dev
```

<http://localhost:3000> を開きます。

### オンライン対戦のテスト

同じPCで試す場合:

1. <http://localhost:3000> をブラウザ2窓で開く。
2. 片方でオンラインルームを作成する。
3. もう片方でルームコードを入力して参加する。
4. ホスト側から対戦を開始する。

同じ LAN の別端末で試す場合:

```bash
# apps/server/.env
CORS_ORIGIN=http://<host-lan-ip>:3000

# apps/web/.env.local
NEXT_PUBLIC_SERVER_URL=http://<host-lan-ip>:4000

pnpm --filter @worduel/server run dev
pnpm --dir apps/web exec next dev -p 3000 -H 0.0.0.0
```

各プレイヤーの端末から `http://<host-lan-ip>:3000` を開きます。

### 無料ホストのメモ

最初にオンライン対戦を動かすだけなら、次の構成が簡単です。

- **Vercel**: `apps/web`
- **Render**: `apps/server`
- データベースなし。`ENABLE_PERSISTENCE=false` にします。

Vercel 設定:

```bash
Root Directory: apps/web
Build Command: pnpm run build
Environment:
  NEXT_PUBLIC_SERVER_URL=https://<your-render-service>.onrender.com
```

Render 設定:

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

`render.yaml` にも推奨する Render service 設定を書いてあります。server の start script は
`tsx src/index.ts` を使います。これは、Vercel build と同じ workspace TypeScript package
を server 側でも直接解決できるようにするためです。

### ゲームルール

- 1試合は **60秒** です。
- 各プレイヤーは **10秒ごと** に出題トークンを1つ獲得します。最大2つまで保持できます。
- トークンを1つ使うと、3つの候補単語を引けます。その中から1つ選んで相手に送ります。
- 回答側には5つの固定パズルスロットがあります。
- 1回の3文字入力は、進行中のすべてのスロットに同時に適用されます。
- 終了後のリザルト画面では、解いた/時間切れになったパズルと実際の試行結果を確認できます。

スコア:

- 回答側: 基本 `+10`、1/2/3回目正解で `+5/+3/+1`、さらに
  `max(0, 15 - 秒数)` の速度ボーナス。
- 出題側: 相手が解くまでにかかった秒数ごとに `+1`。試合終了時に未解決のパズルも対象です。

### Socket.IO events

`packages/shared/src/socket.ts` で定義し、`apps/server/src/socket/handlers.ts` で実装しています。

| Direction | Events |
| --- | --- |
| Client -> Server | `create_room`, `join_room`, `leave_room`, `start_match`, `get_question_candidates`, `send_question`, `submit_guess` |
| Server -> Client | `match_state_updated`, `match_finished`, `player_disconnected`, `error` |

### よく使うコマンド

```bash
pnpm typecheck
pnpm test
pnpm --dir apps/web run build
pnpm --filter @worduel/server... run build
```

### 現在の制限

- ゲスト対戦のみ。サインアップ/ログインは未実装です。
- プライベートルームのみ。公開マッチングキューはありません。
- ルーム状態はプロセスメモリ上にあるため、サーバー再起動で進行中のルームは消えます。
- Redis helper はありますが、現時点ではルーム永続化には使っていません。
- 再接続は最低限です。切断プレイヤーは offline 表示になりますが、セッション復帰は未実装です。
- 試合履歴の保存は任意で、best-effort です。
- 観戦者機能はありません。
- 単語辞書は英語のみです。
