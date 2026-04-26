#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Parse MCQ bank file into questions.json for the web app."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "1"
OUT = ROOT / "questions.json"

# Source file sometimes glues "Lec 6" + "2." into "62. Question:" — match any N. Question:
BLOCK = re.compile(
    r"\d+\.\s+Question:\s+"
    r"(?P<qen>.+?)\s+ترجمة السؤال:\s+"
    r"(?P<qar>.+?)\s+Options:\s+"
    r"(?P<opts>.+?)\s+Correct Answer:\s*"
    r"(?P<ans>[A-D])\s+"
    r"السبب والمرجع:\s+"
    r"(?P<exp>.+?)(?=\s*\d+\.\s+Question:|$)",
    re.DOTALL | re.IGNORECASE,
)


def main():
    raw = SRC.read_text(encoding="utf-8")
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    if not lines:
        raise SystemExit("empty file")
    title = lines[0]
    body = "\n".join(lines[1:]) if len(lines) > 1 else ""

    questions = []
    for i, m in enumerate(BLOCK.finditer(body), start=1):
        qen = clean(m.group("qen"))
        qar = clean(m.group("qar"))
        opts = parse_options(clean(m.group("opts")))
        ans = m.group("ans").upper()
        exp = clean(m.group("exp"))
        exp = re.sub(r"\s+Lec\s*(\d+)?\s*$", "", exp, flags=re.IGNORECASE).strip()

        if len(opts) < 4:
            opts = {
                "A": clean(m.group("opts")),
                "B": "",
                "C": "",
                "D": "",
            }

        questions.append(
            {
                "id": i,
                "question": {"en": qen, "ar": qar},
                "options": opts,
                "correct": ans,
                "explanation": exp,
            }
        )

    OUT.write_text(
        json.dumps({"title": title, "questions": questions}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {len(questions)} questions to {OUT}")


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def parse_options(blob: str) -> dict:
    labels = ["A", "B", "C", "D"]
    parts = re.split(r"\s*\(([A-D])\)\s*", blob, flags=re.IGNORECASE)
    out = {}
    i = 1
    while i + 1 < len(parts):
        lab = parts[i].upper()
        text = clean(parts[i + 1])
        if lab in labels:
            out[lab] = text
        i += 2
    return out


if __name__ == "__main__":
    main()
