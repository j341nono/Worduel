"use client";
import { useEffect } from "react";
import { create } from "zustand";

export type Locale = "ja" | "en";

interface I18nStore {
  locale: Locale;
  hydrated: boolean;
  setLocale: (l: Locale) => void;
  hydrate: () => void;
}

export const useI18nStore = create<I18nStore>((set) => ({
  locale: "ja", // SSR / first render default
  hydrated: false,
  setLocale(l) {
    set({ locale: l });
    try {
      window.localStorage.setItem("worduel-locale", l);
    } catch {}
  },
  hydrate() {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem("worduel-locale");
      if (saved === "ja" || saved === "en") set({ locale: saved });
    } catch {}
    set({ hydrated: true });
  },
}));

export function useHydrateLocale(): void {
  const hydrate = useI18nStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
}

// -------------------- translations --------------------

type Dict = Record<string, unknown>;

const ja: Dict = {
  app: { name: "Worduel", tagline: "3文字単語の対戦ゲーム" },
  nav: { cpu: "CPU対戦", online: "オンライン" },
  footer: "短時間で語彙を鍛えよう",
  home: {
    description:
      "60秒の1対1の単語デュエル。10秒ごとにトークンが貯まり、トークンを使って相手に3文字の単語パズルを出題。相手のパズルを素早く解いて、タイマー終了時にスコアが高い方が勝ち！",
    startCpu: "CPUと対戦する",
    createRoom: "オンラインルームを作成",
    joinRoom: "ルームに参加",
    rule1Title: "試合時間",
    rule1Body: "60秒で勝敗が決まります。",
    rule2Title: "トークン",
    rule2Body: "5・15・25・35・45秒で1つずつ獲得（最大2つまでストック）。出題に1つ使います。",
    rule3Title: "パズル",
    rule3Body: "5スロット固定。1回の入力で全てのパズルに同時挑戦。何度でも予想OK。",
    rulesTitle: "ルール詳細",
  },
  rules: {
    section1Title: "勝利条件",
    section1Body:
      "60秒の制限時間内にスコアの多い方が勝ちです。同点の場合は引き分けになります。",
    section2Title: "トークンと出題",
    section2Body:
      "試合開始5秒後に最初のトークンが手に入り、その後10秒ごとに1つずつ獲得します（5・15・25・35・45秒で計5回、最大2つまでストック可）。終盤の15秒は新規トークンが出ないので、残りの問題を解く時間として使えます。トークンを1つ消費すると、サーバから3つの候補単語が表示され、その中から1つを選んで相手に出題できます。",
    section3Title: "解答のしくみ",
    section3Body:
      "画面には5つのパズルスロットが常に表示され、相手が出題するごとに左から順に埋まります。あなたが入力する3文字は、進行中のすべてのパズルに同時に適用されます。正解したスロットはロックされ、それ以降はそのままの状態で残ります（答えも表示されます）。1パズルあたりの予想回数は無制限。文字ごとに次のフィードバックが返ります：『正解(緑)』＝文字も位置も合っている、『近い(黄)』＝文字は使われているが位置が違う、『はずれ(灰)』＝その文字は答えに含まれない。",
    section4Title: "スコア計算",
    section4Body:
      "正解した側：+10点（基本）／+5点（1回目正解）・+3点（2回目）・+1点（3回目）／速さボーナス＝max(0, 15 − 解答秒数)。4回目以降の予想で正解した場合はボーナスなしで +10点のみ。出題した側：相手が解答するまでに経った秒数 × 1点。試合終了時にスロットがアクティブのままなら、出題者は時間ボーナスのみ獲得。",
    section5Title: "戦略のヒント",
    section5Body:
      "難しいパズルでも、解いている過程で得た色情報を他のパズルにも使えるので、複数同時並行で進めると効率的です。出題側は早く送るほど時間ボーナスが伸びるので、トークンを溜め込まず早めに使うのが基本。",
  },
  cpu: {
    title: "CPUと対戦",
    description: "CPU相手に練習できます。トークン・スコア・タイミングは本番ルールと同じです。",
    start: "対戦開始",
    difficultyEasy: "やさしい",
    difficultyNormal: "ふつう",
    difficultyHard: "むずかしい",
    nameYou: "あなた",
    nameCpu: "CPU ({{difficulty}})",
  },
  online: {
    title: "オンラインルーム",
    create: "作成",
    join: "参加",
    displayName: "プレイヤー名",
    displayNamePlaceholder: "プレイヤー1",
    roomCode: "ルームコード",
    roomCodePlaceholder: "ABC123",
    createRoom: "ルーム作成",
    joinRoom: "ルーム参加",
    roomTitle: "ルーム {{code}}",
    shareCode: "このコードを相手に共有してください。揃ったらホストが開始ボタンを押します。",
    players: "プレイヤー",
    you: "あなた",
    opponent: "相手",
    waitingSecondPlayer: "もう1人のプレイヤーを待っています…",
    startMatch: "対戦開始",
    leaveRoom: "ルームから出る",
    loading: "読み込み中…",
  },
  hud: {
    you: "あなた",
    opponent: "相手",
    waiting: "待機中…",
    pts: "点",
    time: "残り時間",
    phaseLobby: "ロビー",
    phaseRunning: "対戦中",
    phaseFinished: "終了",
    offline: "切断",
  },
  puzzle: {
    incoming: "受信中のパズル",
    noActive: "現在パズルはありません",
    waitForOpponent: "相手の出題を待ちましょう。",
    guessBtn: "予想する",
    invalidShape: "3文字で入力してください",
    invalidDictionary: "辞書にない単語です",
    solved: "正解！",
    failed: "失敗",
    expired: "試合終了",
    word: "答え:",
    placeholder: "abc",
    activeCount: "進行中 {{n}}/{{total}}",
    slotEmpty: "未使用",
    slotWaiting: "相手の出題待ち",
    slotActive: "解答中",
    noActiveYet: "まだ受信中のパズルはありません",
    sharedHint: "1回の入力が、進行中のすべてのパズルに同時に反映されます。正解したスロットはロックされます。",
  },
  send: {
    title: "パズルを送る",
    tokensHeld: "所持トークン {{n}}",
    draw: "3つの候補を引く（トークン -1）",
    drawing: "候補を取得中…",
    noToken: "トークン未獲得",
    hint: "3つの候補から1つ選んで送ります。相手は3回まで予想可、時間制限なし（試合終了まで）。",
  },
  feed: {
    title: "直近のパズル",
    youSent: "あなたが出題",
    oppSent: "相手が出題",
    solvedByThem: "→ 相手が正解",
    solvedByYou: "→ あなたが正解",
    missedByThem: "→ 相手はミス",
    missedByYou: "→ あなたはミス",
    statusSolved: "正解",
    statusFailed: "失敗",
    statusExpired: "時間切れ",
  },
  end: {
    finished: "試合終了",
    draw: "引き分け！",
    youWon: "あなたの勝ち！",
    oppWon: "{{name}} の勝ち",
    playAgain: "もう一度",
    home: "ホームへ",
    yourFinalScore: "最終スコア: {{n}}",
    cpuSuffix: " · CPU",
    resultHistory: "解答履歴",
    yourAttempts: "あなたの解答",
    opponentAttempts: "相手の解答",
    youAnswered: "あなたが回答",
    opponentAnswered: "相手が回答",
    guessCount: "{{n}}回",
    noAttempts: "対象のパズルはありません。",
    noGuesses: "試行なし",
  },
  notify: {
    oppSolvedYours: "相手があなたのパズル「{{word}}」を正解しました",
    oppFailedYours: "相手はあなたのパズル「{{word}}」を解けませんでした！",
    youSolved: "ナイス！「{{word}}」を正解",
    youMissed: "残念…答えは「{{word}}」でした",
    oppDisconnected: "相手が切断しました",
  },
  language: { label: "言語", ja: "日本語", en: "English" },
};

const en: Dict = {
  app: { name: "Worduel", tagline: "3-letter word battles" },
  nav: { cpu: "CPU", online: "Online" },
  footer: "Short matches, sharp vocab",
  home: {
    description:
      "A 60-second 1-on-1 word duel. Every 10 seconds you earn a token. Spend a token to send your opponent a 3-letter puzzle — and race to crack theirs first. More points than your rival when the timer hits zero, you win.",
    startCpu: "Start CPU Battle",
    createRoom: "Create Online Room",
    joinRoom: "Join Room",
    rule1Title: "Match length",
    rule1Body: "60 seconds, sudden-stop scoring.",
    rule2Title: "Tokens",
    rule2Body: "Earned at 5/15/25/35/45s (max 2 stored). Spend one to send a puzzle.",
    rule3Title: "Puzzles",
    rule3Body: "Five fixed slots. Each guess hits every active puzzle at once — unlimited attempts.",
    rulesTitle: "How to play",
  },
  rules: {
    section1Title: "Winning",
    section1Body:
      "Highest score when the 60-second timer hits zero wins. Equal scores end in a draw.",
    section2Title: "Tokens & sending",
    section2Body:
      "The first token arrives 5 seconds in, then one every 10 seconds (5 tokens total over the match, max 2 stored). No new tokens drop in the final 15 seconds — that window is left for finishing your incoming puzzles. Spend a token to draw 3 candidate words and pick one to send.",
    section3Title: "Solving",
    section3Body:
      "Five puzzle slots are visible at all times; each new opponent puzzle fills the next slot from the left. The 3-letter word you type is applied simultaneously to EVERY active puzzle — each gets its own color feedback. Solved slots get locked in place (the answer is revealed). There is no per-puzzle guess limit, so keep guessing until the slot is solved or the match ends.",
    section4Title: "Scoring",
    section4Body:
      "Solver: +10 base, +5/+3/+1 for guess #1/#2/#3, +max(0, 15 − seconds) speed bonus. Solves on guess 4 or later still score +10 with no bonus. Sender: +1 per second the opponent took to solve (or until match end if still active).",
    section5Title: "Strategy tips",
    section5Body:
      "Letters you learn from one puzzle still inform the others, so working multiple puzzles in parallel is efficient. Senders should spend tokens early — the per-second bonus grows the longer the receiver stalls.",
  },
  cpu: {
    title: "CPU Battle",
    description: "Practice against the CPU. Tokens, scoring and timing match online play.",
    start: "Start match",
    difficultyEasy: "easy",
    difficultyNormal: "normal",
    difficultyHard: "hard",
    nameYou: "You",
    nameCpu: "CPU ({{difficulty}})",
  },
  online: {
    title: "Online Room",
    create: "Create",
    join: "Join",
    displayName: "Display name",
    displayNamePlaceholder: "Player one",
    roomCode: "Room code",
    roomCodePlaceholder: "ABC123",
    createRoom: "Create room",
    joinRoom: "Join room",
    roomTitle: "Room {{code}}",
    shareCode: "Share this code with a friend. The match starts when you press start.",
    players: "Players",
    you: "you",
    opponent: "opponent",
    waitingSecondPlayer: "Waiting for second player…",
    startMatch: "Start match",
    leaveRoom: "Leave room",
    loading: "Loading…",
  },
  hud: {
    you: "You",
    opponent: "Opponent",
    waiting: "Waiting…",
    pts: "pts",
    time: "Time",
    phaseLobby: "lobby",
    phaseRunning: "running",
    phaseFinished: "finished",
    offline: "offline",
  },
  puzzle: {
    incoming: "Incoming puzzles",
    noActive: "No active puzzle.",
    waitForOpponent: "Wait for your opponent to send one.",
    guessBtn: "Guess",
    invalidShape: "Need 3 letters.",
    invalidDictionary: "Not in the dictionary.",
    solved: "Solved!",
    failed: "Failed",
    expired: "Match ended",
    word: "Word:",
    placeholder: "abc",
    activeCount: "active {{n}}/{{total}}",
    slotEmpty: "empty",
    slotWaiting: "awaiting puzzle",
    slotActive: "solving",
    noActiveYet: "No active puzzle yet.",
    sharedHint: "Your guess is applied to every active puzzle at once. Solved slots get locked.",
  },
  send: {
    title: "Send a puzzle",
    tokensHeld: "tokens: {{n}}",
    draw: "Draw 3 candidate words (−1 token)",
    drawing: "Drawing words…",
    noToken: "No token yet",
    hint: "Choose one of three suggested words. Opponent gets 3 guesses, no per-puzzle timer.",
  },
  feed: {
    title: "Recent puzzles",
    youSent: "You sent",
    oppSent: "Opponent sent",
    solvedByThem: "— they solved it",
    solvedByYou: "— you solved it",
    missedByThem: "— they missed",
    missedByYou: "— you missed",
    statusSolved: "solved",
    statusFailed: "failed",
    statusExpired: "expired",
  },
  end: {
    finished: "Match finished",
    draw: "Draw!",
    youWon: "You won!",
    oppWon: "{{name}} won",
    playAgain: "Play again",
    home: "Home",
    yourFinalScore: "Your final score: {{n}}",
    cpuSuffix: " · CPU",
    resultHistory: "Result history",
    yourAttempts: "Your attempts",
    opponentAttempts: "Opponent attempts",
    youAnswered: "you answered",
    opponentAnswered: "opponent answered",
    guessCount: "{{n}} tries",
    noAttempts: "No puzzles for this player.",
    noGuesses: "No guesses",
  },
  notify: {
    oppSolvedYours: "Opponent solved your puzzle “{{word}}”",
    oppFailedYours: "Opponent failed your puzzle “{{word}}”!",
    youSolved: "Nice! You solved “{{word}}”",
    youMissed: "Missed — the answer was “{{word}}”",
    oppDisconnected: "Opponent disconnected",
  },
  language: { label: "Language", ja: "日本語", en: "English" },
};

const dicts: Record<Locale, Dict> = { ja, en };

function resolve(dict: Dict, key: string): unknown {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Dict)) {
      cur = (cur as Dict)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined ? `{{${k}}}` : String(v);
  });
}

export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const locale = useI18nStore((s) => s.locale);
  return (key, vars) => {
    const found = resolve(dicts[locale], key) ?? resolve(dicts.ja, key);
    if (typeof found !== "string") return key;
    return interpolate(found, vars);
  };
}
