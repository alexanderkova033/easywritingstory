import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

const src = path.resolve(webRoot, "node_modules", "word-list", "words.txt");
const dest = path.resolve(webRoot, "public", "wordlist-en.txt");

function ensureParentDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function normalizeLines(text) {
  // Keep file small-ish and fast to parse: one lowercase token per line.
  // `word-list` already provides one word per line; we normalize anyway.
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const w = line.trim().toLowerCase();
    if (!w) continue;
    if (w.startsWith("#")) continue;
    // Keep only simple word tokens used by the spellchecker.
    // (Apostrophes are handled by the spellchecker’s normalization rules.)
    if (!/^[a-z]+$/.test(w)) continue;
    out.push(w);
  }
  return `${out.join("\n")}\n`;
}

try {
  if (!fs.existsSync(src)) {
    console.error(`[sync-wordlist] Missing source word list at: ${src}`);
    process.exitCode = 1;
  } else {
    const raw = fs.readFileSync(src, "utf8");
    const normalized = normalizeLines(raw);
    ensureParentDir(dest);
    const existing = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;
    if (existing === normalized) {
      console.log(`[sync-wordlist] ${dest} is already up to date.`);
    } else {
      fs.writeFileSync(dest, normalized, "utf8");
      console.log(`[sync-wordlist] Wrote ${dest} (${normalized.split("\n").length - 1} words)`);
    }
  }
} catch (err) {
  console.error("[sync-wordlist] Failed:", err);
  process.exitCode = 1;
}

