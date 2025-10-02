#!/usr/bin/env python3
"""
Create an AcroForm-enabled Direct Deposit PDF from a flat template using a mapping file.

Usage:
  python3 scripts/create_direct_deposit_acroform.py \
      --input static/direct-deposit-template.pdf \
      --output static/direct-deposit-template.with-fields.pdf \
      --map static/pdf-maps/direct_deposit_v1.json

Notes:
- The mapping JSON uses normalized coordinates (0..1) relative to page width/height
  so it survives DPI changes. Each field contains: page, x1, y1, x2, y2 (normalized),
  and type: text | checkbox | signature.
- This script does not fill values; it only adds fields. Filling occurs at runtime by name.
"""

import argparse
import json
import sys
from pathlib import Path

import fitz  # PyMuPDF


WIDGET_TYPE_MAP = {
    "text": fitz.PDF_WIDGET_TYPE_TEXT,
    "checkbox": fitz.PDF_WIDGET_TYPE_CHECKBOX,
    "signature": getattr(fitz, "PDF_WIDGET_TYPE_SIGNATURE", fitz.PDF_WIDGET_TYPE_TEXT),
}


def norm_to_abs(rect_norm, page_rect):
    """Convert normalized [x1,y1,x2,y2] (0..1) to absolute Rect using page rect."""
    x1n, y1n, x2n, y2n = rect_norm
    x1 = page_rect.x0 + x1n * page_rect.width
    y1 = page_rect.y0 + y1n * page_rect.height
    x2 = page_rect.x0 + x2n * page_rect.width
    y2 = page_rect.y0 + y2n * page_rect.height
    return fitz.Rect(x1, y1, x2, y2)


def add_fields(doc: fitz.Document, mapping: dict):
    fields = mapping.get("fields", {})
    for field_name, cfg in fields.items():
        page_index = int(cfg.get("page", 0))
        if page_index < 0 or page_index >= doc.page_count:
            print(f"Skipping field '{field_name}': invalid page index {page_index}")
            continue

        page = doc[page_index]
        rect_norm = cfg.get("rect") or [cfg.get("x1"), cfg.get("y1"), cfg.get("x2"), cfg.get("y2")]
        if not all(isinstance(v, (int, float)) for v in rect_norm):
            print(f"Skipping field '{field_name}': missing / invalid rect")
            continue

        rect_abs = norm_to_abs(rect_norm, page.rect)
        field_type_str = cfg.get("type", "text")
        field_type = WIDGET_TYPE_MAP.get(field_type_str, fitz.PDF_WIDGET_TYPE_TEXT)

        # Add widget
        try:
            page.add_widget(
                rect_abs,
                field_name=field_name,
                widget_type=field_type,
                text="" if field_type == fitz.PDF_WIDGET_TYPE_TEXT else None,
                font_size=cfg.get("fontSize", 10),
                border_color=None,
                fill_color=None,
            )
        except Exception as e:
            print(f"Warning: failed to add widget for '{field_name}': {e}")


def main():
    parser = argparse.ArgumentParser(description="Convert flat Direct Deposit PDF to AcroForm using mapping")
    parser.add_argument("--input", required=True, help="Path to flat PDF template")
    parser.add_argument("--output", required=True, help="Path to write AcroForm PDF")
    parser.add_argument("--map", required=True, help="Path to mapping JSON")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    map_path = Path(args.map)

    if not input_path.exists():
        print(f"Error: input PDF not found: {input_path}")
        sys.exit(1)
    if not map_path.exists():
        print(f"Error: mapping JSON not found: {map_path}")
        sys.exit(1)

    with open(map_path, "r") as f:
        mapping = json.load(f)

    doc = fitz.open(input_path)

    # Ensure AcroForm root exists (PyMuPDF creates as needed when adding widgets)
    add_fields(doc, mapping)

    # Set NeedAppearances so viewers render fields
    try:
        doc.set_need_appearances(True)
    except Exception:
        pass

    doc.save(output_path)
    doc.close()
    print(f"✅ AcroForm PDF created: {output_path}")


if __name__ == "__main__":
    main()


