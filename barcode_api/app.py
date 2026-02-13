import io

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

num_style = ParagraphStyle(
    "eantext",
    fontSize=9,
    alignment=1,
)

PRESETS = {
    "4": {"per_row": 4, "col_width": 55 * mm},
    "3": {"per_row": 3, "col_width": 70 * mm},
    "6": {"per_row": 6, "col_width": 35 * mm},
}

# 🔥 GS1 STANDARD SETTINGS (100% magnification)
X_DIMENSION = 0.33 * mm     # kapein viiva
BAR_HEIGHT = 23 * mm        # min standard height
QUIET_ZONE = 4 * mm         # min 3.63mm -> käytetään 4mm varman päälle
PER_FILE = 50


def make_barcode(code):
    if len(code) == 13:
        widget = eanbc.Ean13BarcodeWidget(code)
    elif len(code) == 8:
        widget = eanbc.Ean8BarcodeWidget(code)
    else:
        raise ValueError(code)

    widget.humanReadable = True
    widget.barHeight = BAR_HEIGHT
    widget.barWidth = X_DIMENSION
    widget.quiet = True

    bounds = widget.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]

    drawing = Drawing(width + QUIET_ZONE * 2, height)
    drawing.add(widget)

    return [
        drawing,
        Spacer(1, 6),
        Paragraph(code, num_style),
    ]


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True)

    raw = data.get("codes", "")
    preset_key = data.get("preset", "4")

    codes = [c.strip() for c in raw.splitlines() if c.strip()]

    if not codes:
        return jsonify({"error": "No codes"}), 400

    preset = PRESETS.get(preset_key, PRESETS["4"])
    PER_ROW = preset["per_row"]
    COL_WIDTH = preset["col_width"]

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    parts = [codes[i: i + PER_FILE] for i in range(0, len(codes), PER_FILE)]
    flow = []

    for idx, part in enumerate(parts, 1):
        table_data = []
        row = []

        for code in part:
            row.append(make_barcode(code))
            if len(row) == PER_ROW:
                table_data.append(row)
                row = []

        if row:
            table_data.append(row)

        table = Table(table_data, colWidths=[COL_WIDTH] * PER_ROW)

        table.setStyle(
            TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),

                # Extra padding ettei quiet zone leikkaannu
                ("LEFTPADDING", (0, 0), (-1, -1), 15),
                ("RIGHTPADDING", (0, 0), (-1, -1), 15),
                ("TOPPADDING", (0, 0), (-1, -1), 15),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
            ])
        )

        flow.append(Paragraph(f"PART {idx}", styles["Title"]))
        flow.append(Spacer(1, 10))
        flow.append(table)

    doc.build(flow)
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="barcodes.pdf",
    )


if __name__ == "__main__":
    app.run(port=5000, debug=True)