import json
import os
import sys
from typing import Dict, Any, List

import fitz  # PyMuPDF


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEMPLATE = os.path.join(ROOT, "static", "HI Form_final3.pdf")
WIDGETS_JSON = os.path.join(ROOT, "static", "hi_form_widgets.json")
INDEXED_PDF = os.path.join(ROOT, "static", "HI_form_indexed.pdf")


def extract_widgets(doc: fitz.Document) -> List[Dict[str, Any]]:
    widgets: List[Dict[str, Any]] = []
    for page in doc:
        for w in page.widgets() or []:
            widgets.append({
                "name": w.field_name,
                "type": getattr(w, 'field_type_string', str(getattr(w, 'field_type', ''))),
                "rect": [round(w.rect.x0, 2), round(w.rect.y0, 2), round(w.rect.x1, 2), round(w.rect.y1, 2)],
                "pg": page.number + 1,
            })
    return widgets


def annotate_pdf(doc: fitz.Document, widgets: List[Dict[str, Any]]):
    for idx, w in enumerate(widgets, start=1):
        pg = int(w["pg"]) - 1
        rect = fitz.Rect(*w["rect"])
        page = doc[pg]
        # Draw rectangle
        page.draw_rect(rect, color=(1, 0, 0), width=0.6)
        # Label with index and short name
        name = (w.get("name") or "").replace("\n", " ")
        label = f"#{idx} {name[:28]}" if len(name) > 28 else f"#{idx} {name}"
        page.insert_text((rect.x1 + 2, rect.y0 + 8), label, fontsize=7, color=(0, 0, 1))


def main():
    if not os.path.exists(TEMPLATE):
        print(f"Template not found: {TEMPLATE}", file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(TEMPLATE)
    try:
        widgets = extract_widgets(doc)
        # Save JSON mapping
        with open(WIDGETS_JSON, "w") as f:
            json.dump({"num_pages": doc.page_count, "num_fields": len(widgets), "fields": widgets}, f, indent=2)
        # Annotate and save indexed PDF
        annotate_pdf(doc, widgets)
        doc.save(INDEXED_PDF)
        print(json.dumps({
            "ok": True,
            "widgets_json": WIDGETS_JSON,
            "indexed_pdf": INDEXED_PDF,
            "num_fields": len(widgets)
        }))
    finally:
        doc.close()


if __name__ == "__main__":
    main()



