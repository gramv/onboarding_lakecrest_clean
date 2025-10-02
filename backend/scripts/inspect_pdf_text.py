#!/usr/bin/env python3
import sys
from pathlib import Path
import fitz  # PyMuPDF

def main():
    if len(sys.argv) < 2:
        print("Usage: inspect_pdf_text.py <pdf_path>")
        sys.exit(1)
    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(f"Not found: {pdf_path}")
        sys.exit(1)

    doc = fitz.open(pdf_path)
    for i, page in enumerate(doc):
        print(f"\n=== Page {i} size={page.rect} ===")
        blocks = page.get_text("blocks")
        # Sort blocks by y, then x
        blocks.sort(key=lambda b: (round(b[1], 1), round(b[0], 1)))
        for b in blocks:
            x0, y0, x1, y1, text, *rest = b
            text = (text or '').strip()
            if not text:
                continue
            print(f"[{x0:.1f},{y0:.1f},{x1:.1f},{y1:.1f}] {text}")
    doc.close()

if __name__ == "__main__":
    main()


