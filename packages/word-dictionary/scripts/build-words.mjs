import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve(process.argv[2] ?? process.env.WORDUEL_WORD_SOURCE ?? "/usr/share/dict/words");
const outPath = resolve(process.argv[3] ?? "src/words.ts");

const blocked = new Set([
  "ass",
  "cum",
  "fag",
  "gyp",
  "jap",
  "nig",
  "sex",
  "tit",
  "wop",
]);

const words = Array.from(
  new Set(
    readFileSync(sourcePath, "utf8")
      .split(/\r?\n/)
      .map((w) => w.trim())
      .filter((w) => /^[a-z]{3}$/.test(w))
      .filter((w) => !blocked.has(w)),
  ),
).sort();

const rows = [];
for (let i = 0; i < words.length; i += 10) {
  rows.push(`  ${words.slice(i, i + 10).map((w) => `"${w}"`).join(", ")},`);
}

const body = `// Generated from ${sourcePath}.
// Run \`pnpm --filter @worduel/word-dictionary run build:words\` to refresh.
// All entries are lowercase, length 3, alphabetic only.

export const THREE_LETTER_WORDS: readonly string[] = [
${rows.join("\n")}
] as const;
`;

writeFileSync(outPath, body);
console.log(`Wrote ${words.length} words to ${outPath}`);
