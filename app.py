import io
from datetime import datetime

from flask import Flask, request, send_file, jsonify
from flask_cors import CORS

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.pagesizes import A4
from reportlab.graphics.barcode import eanbc
from reportlab.graphics.shapes import Drawing
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors

app = Flask(__name__)
CORS(app)

styles = getSampleStyleSheet()

# 🔹 Nimi-tyyli (siistimpi)
name_style = ParagraphStyle(
    "productname",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=8,
    leading=10,
    alignment=1,
)

PRESETS = {
    "4": {"per_row": 4, "col_width": 55 * mm},
    "3": {"per_row": 3, "col_width": 70 * mm},
    "6": {"per_row": 6, "col_width": 35 * mm},
}

# Zebra + office printer friendly
X_DIMENSION = 0.42 * mm
BAR_HEIGHT = 20 * mm
PER_FILE = 50


def clean_name(name: str):
    """
    🔹 Max 60 chars
    🔹 Wrap automatically
    """
    name = name.strip()

    if len(name) > 60:
        name = name[:57] + "..."

    return name


def make_barcode(code, name=""):
    try:
        if len(code) == 13:
            widget = eanbc.Ean13BarcodeWidget(code)
        elif len(code) == 8:
            widget = eanbc.Ean8BarcodeWidget(code)
        else:
            return None

        widget.humanReadable = True
        widget.barHeight = BAR_HEIGHT
        widget.barWidth = X_DIMENSION
        widget.quiet = True

        bounds = widget.getBounds()
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]

        drawing = Drawing(width, height)
        drawing.add(widget)

        elements = [drawing]

        if name:
            elements.append(Spacer(1, 6))
            elements.append(Paragraph(clean_name(name), name_style))

        return elements

    except Exception:
        return None


@app.route("/generate", methods=["POST"])
def generate():
    try:
        data = request.get_json(force=True)

        raw = data.get("codes", "")
        preset_key = data.get("preset", "3")  # 🔥 3 PER ROW DEFAULT

        lines = [l.strip() for l in raw.splitlines() if l.strip()]

        entries = []
        i = 0

        while i < len(lines):
            current = lines[i]

            if current.isdigit() and len(current) in (8, 13):
                entries.append((current, ""))
                i += 1
            else:
                if i + 1 < len(lines):
                    next_line = lines[i + 1]
                    if next_line.isdigit() and len(next_line) in (8, 13):
                        entries.append((next_line, current))
                        i += 2
                        continue
                i += 1

        if not entries:
            return jsonify({"error": "No valid codes"}), 400

        preset = PRESETS.get(preset_key, PRESETS["3"])
        per_row = preset["per_row"]
        col_width = preset["col_width"]

        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=15 * mm,
            rightMargin=15 * mm,
            topMargin=15 * mm,
            bottomMargin=15 * mm,
        )

        flow = []

        parts = [entries[i:i + PER_FILE] for i in range(0, len(entries), PER_FILE)]

        for part in parts:

            table_data = []
            row = []

            for code, name in part:
                elements = make_barcode(code, name)
                if elements:
                    row.append(elements)

                if len(row) == per_row:
                    table_data.append(row)
                    row = []

            if row:
                table_data.append(row)

            if not table_data:
                continue

            table = Table(table_data, colWidths=[col_width] * per_row)

            table.setStyle(
                TableStyle([
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),

                    # 🔥 ENEMMÄN SPACING
                    ("LEFTPADDING", (0, 0), (-1, -1), 18),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 18),
                    ("TOPPADDING", (0, 0), (-1, -1), 20),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 28),
                ])
            )

            flow.append(table)
            flow.append(Spacer(1, 15))

        doc.build(flow)
        buffer.seek(0)

        # 🔥 DATE IN FILENAME
        today = datetime.now().strftime("%Y-%m-%d")

        return send_file(
            buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"barcodes_{today}.pdf",
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5000, debug=True)