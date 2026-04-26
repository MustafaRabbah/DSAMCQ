/**
 * Parses bank.txt into questions JSON (English). Run: node scripts/parse-bank.mjs
 * Optional: TRANSLATE=1 node scripts/parse-bank.mjs  — fills ar via Google gtx (needs network).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BANK = path.join(root, "bank.txt");
const OUT = path.join(root, "questions.json");

const DO_TRANSLATE = process.env.TRANSLATE === "1";
const TRANSLATE_OPTIONS = process.env.TRANSLATE_OPTIONS === "1";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** @param {string} text */
async function translateEnToAr(text) {
  const t = text.trim();
  if (!t) return "";
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=" +
    encodeURIComponent(t.slice(0, 4500));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
  const data = await res.json();
  const out = data?.[0]?.map((x) => x[0]).join("") ?? "";
  return out.trim();
}

/** @param {string} line */
function parseOptionLine(line) {
  const m = line.match(/^\s*([a-eA-E]|[f-jF-J])\)\s*(.*)$/);
  if (!m) return null;
  let L = m[1].toUpperCase();
  if (L >= "F" && L <= "J") {
    L = String.fromCharCode("A".charCodeAt(0) + (L.charCodeAt(0) - "F".charCodeAt(0)));
  }
  if (L < "A" || L > "E") return null;
  return { letter: L, text: m[2].trim() };
}

/** Heuristic: section title line (topic), not a question or option */
function looksLikeSectionTitle(line) {
  const s = line.trim();
  if (!s || s.length > 72) return false;
  if (/^\d+\./.test(s)) return false;
  if (/^[a-eA-Ef-jF-J]\)/.test(s)) return false;
  if (/^Answer:/i.test(s)) return false;
  if (s.includes("?")) return false;
  if (/^\s*[A-E]\)/.test(s)) return false;
  if (/http/i.test(s)) return false;
  return true;
}

function parseBank(raw) {
  const lines = raw.split(/\r?\n/);
  let topic = "";
  /** @type {{ topic: string, q: string, options: Record<string, string>, correct?: string } | null} */
  let cur = null;
  /** @type {{ topic: string, q: string, options: Record<string, string>, correct: string }[]} */
  const out = [];
  let lastOptLetter = null;

  function flush() {
    if (!cur || !cur.correct) return;
    const keys = Object.keys(cur.options);
    if (keys.length === 0) return;
    if (!cur.options[cur.correct]) return;
    out.push({
      topic: cur.topic,
      q: cur.q.trim(),
      options: { ...cur.options },
      correct: cur.correct,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const ans = trimmed.match(/^Answer:\s*([A-Ea-e])\s*$/i);
    if (ans) {
      if (cur) {
        cur.correct = ans[1].toUpperCase();
        flush();
      }
      cur = null;
      lastOptLetter = null;
      continue;
    }

    const opt = parseOptionLine(line);
    if (opt && cur) {
      cur.options[opt.letter] = opt.text;
      lastOptLetter = opt.letter;
      continue;
    }

    const qm = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (qm) {
      flush();
      cur = { topic, q: qm[2].trim(), options: {} };
      lastOptLetter = null;
      continue;
    }

    if (looksLikeSectionTitle(line) && !cur) {
      topic = trimmed;
      continue;
    }

    // Continuation: append to question or last option
    if (cur) {
      if (Object.keys(cur.options).length === 0) {
        cur.q += " " + trimmed;
      } else if (lastOptLetter && cur.options[lastOptLetter] !== undefined) {
        cur.options[lastOptLetter] = (cur.options[lastOptLetter] + " " + trimmed).trim();
      } else {
        const letters = Object.keys(cur.options).sort();
        const last = letters[letters.length - 1];
        if (last) cur.options[last] = (cur.options[last] + " " + trimmed).trim();
        else cur.q += " " + trimmed;
      }
    }
  }

  flush();
  return out;
}

async function main() {
  const raw = fs.readFileSync(BANK, "utf8");
  const parsed = parseBank(raw);

  /** @type {any[]} */
  const questions = [];
  let id = 1;
  for (const p of parsed) {
    const explanation = p.topic ? `الموضوع: ${p.topic}. الإجابة الصحيحة هي ${p.correct}.` : `الإجابة الصحيحة هي ${p.correct}.`;

    const base = {
      id: id++,
      question: { en: p.q, ar: "" },
      options: p.options,
      correct: p.correct,
      explanation,
    };
    if (p.topic) base.topic = p.topic;

    if (DO_TRANSLATE) {
      try {
        base.question.ar = await translateEnToAr(p.q);
        await sleep(100);
        if (TRANSLATE_OPTIONS) {
          base.optionsAr = {};
          for (const L of Object.keys(p.options).sort()) {
            base.optionsAr[L] = await translateEnToAr(p.options[L]);
            await sleep(70);
          }
        }
      } catch (e) {
        console.error("Translate failed:", e.message);
        base.question.ar = base.question.ar || "";
      }
    } else {
      base.question.ar = "";
    }

    questions.push(base);
  }

  const payload = {
    title: "هياكل البيانات والخوارزميات — بنك أسئلة من bank.txt",
    questions,
  };

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${questions.length} questions to questions.json (translate=${DO_TRANSLATE})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
