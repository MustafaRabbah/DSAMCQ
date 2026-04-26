#!/usr/bin/env python3
"""Extract plain text from all PDFs in PDFs/ into extracted/"""
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parent
PDF_DIR = ROOT / "PDFs"
OUT_DIR = ROOT / "extracted"


def main():
    OUT_DIR.mkdir(exist_ok=True)
    for pdf in sorted(PDF_DIR.glob("*.pdf")):
        doc = fitz.open(pdf)
        parts = []
        for page in doc:
            parts.append(page.get_text("text"))
        text = "\n\n".join(parts)
        out = OUT_DIR / (pdf.stem + ".txt")
        out.write_text(text, encoding="utf-8")
        print(f"{pdf.name}: {len(text)} chars, {len(doc)} pages -> {out.name}")
        doc.close()


if __name__ == "__main__":
    main()
