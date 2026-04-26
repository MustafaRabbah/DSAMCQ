#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Merge questions.json (manual bank) + questions_pdf.json into questions.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANUAL = ROOT / "questions_manual.json"
PDF = ROOT / "questions_pdf.json"
OUT = ROOT / "questions.json"


def main():
    base = json.loads(MANUAL.read_text(encoding="utf-8"))
    extra = json.loads(PDF.read_text(encoding="utf-8"))
    merged = (base.get("questions") or []) + (extra.get("questions") or [])
    title = f"{base.get('title', 'MCQ')} + {extra.get('title', 'PDF')}"
    for i, q in enumerate(merged, start=1):
        q["id"] = i
    OUT.write_text(
        json.dumps({"title": title, "questions": merged}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Merged {len(merged)} questions -> {OUT}")


if __name__ == "__main__":
    main()
