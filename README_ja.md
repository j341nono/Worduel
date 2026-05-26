# Worduel

[English README](README.md)

Worduel は、60秒で勝敗が決まる 1対1 のリアルタイム単語対戦ゲームです。試合開始時に
両プレイヤーへ同じ3文字の Wordle 風パズルセットが配られます。1回の解答入力は、
未解決のすべてのパズルスロットへ同時に適用され、正解数と解答速度で勝敗が決まります。

このリポジトリは MVP の monorepo です。Next.js クライアント、Fastify + Socket.IO
対戦サーバー、共有 TypeScript ゲームルール、任意の PostgreSQL 永続化、ルールエンジン
向けの Vitest テストを含みます。

## 技術スタック

- **フロントエンド**: Next.js 14 App Router, React 18, Tailwind CSS, Zustand, socket.io-client
- **バックエンド**: Node.js, Fastify, Socket.IO, Prisma
- **任意の永続化**: PostgreSQL
- **準備済みだが未使用**: Redis / ioredis の helper はありますが、現在のルーム状態はメモリ上で管理しています
- **共有コード**: pnpm workspace の TypeScript packages
- **テスト**: Vitest

## ディレクトリ構成

```text
apps/
  web/              Next.js クライアント: ホーム、CPU対戦、オンラインルーム
  server/           Fastify + Socket.IO の権威サーバー
packages/
  game-core/        feedback、scoring、validation、CPU helper などの純粋なゲームルール
  shared/           共有 TypeScript 型と Socket.IO contract
  word-dictionary/  3文字単語リストと helper
```

## ローカル開発

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

## オンライン対戦のテスト

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

## 無料ホストのメモ

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

## ゲームルール

- 1試合は **60秒** です。
- サーバーが試合開始時に **5つの共通答え単語** を決めます。
- 両プレイヤーには同じ5つの固定パズルスロットが配られます。
- 1回の3文字入力は、未解決のすべてのスロットに同時に適用されます。
- 終了後のリザルト画面では、解いた/時間切れになったパズルと実際の試行結果を確認できます。

スコア:

- 回答側: 基本 `+10`、1/2/3回目正解で `+5/+3/+1`、さらに
  `max(0, 15 - 秒数)` の速度ボーナス。
- 未解決のスロットには得点が入りません。

## 単語辞書

辞書は `packages/word-dictionary/src/words.ts` で管理しています。3文字の小文字英単語を
生成したリストで、次のコマンドで更新できます。

```bash
pnpm --filter @worduel/word-dictionary run build:words
```

デフォルトでは `/usr/share/dict/words` を読み込みます。より大きい外部辞書を使いたい場合は、
生成スクリプトに別の source path を渡せます。

## Socket.IO events

`packages/shared/src/socket.ts` で定義し、`apps/server/src/socket/handlers.ts` で実装しています。

| Direction | Events |
| --- | --- |
| Client -> Server | `create_room`, `join_room`, `leave_room`, `start_match`, `submit_guess` |
| Server -> Client | `match_state_updated`, `match_finished`, `player_disconnected`, `error` |

## よく使うコマンド

```bash
pnpm typecheck
pnpm test
pnpm --dir apps/web run build
pnpm --filter @worduel/server... run build
```

## 現在の制限

- ゲスト対戦のみ。サインアップ/ログインは未実装です。
- プライベートルームのみ。公開マッチングキューはありません。
- ルーム状態はプロセスメモリ上にあるため、サーバー再起動で進行中のルームは消えます。
- Redis helper はありますが、現時点ではルーム永続化には使っていません。
- 再接続は最低限です。切断プレイヤーは offline 表示になりますが、セッション復帰は未実装です。
- 試合履歴の保存は任意で、best-effort です。
- 観戦者機能はありません。
- 単語辞書は英語のみです。
