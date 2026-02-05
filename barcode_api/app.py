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
    "4": {"per_row": 4, "col_width": 50 * mm},
    "3": {"per_row": 3, "col_width": 65 * mm},
    "6": {"per_row": 6, "col_width": 32 * mm},
}

BAR_HEIGHT = 15 * mm
BAR_WIDTH = 0.34
PER_FILE = 50


def make_barcode(code):
    if len(code) == 13:
        widget = eanbc.Ean13BarcodeWidget(code)
    elif len(code) == 8:
        widget = eanbc.Ean8BarcodeWidget(code)
    else:
        raise ValueError(code)

    widget.humanReadable = False
    widget.barHeight = BAR_HEIGHT
    widget.barWidth = BAR_WIDTH

    b = widget.getBounds()
    d = Drawing(b[2] - b[0], b[3] - b[1])
    d.add(widget)

    return [
        d,
        Spacer(1, 8),
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

    preset = PRESETS[preset_key]
    PER_ROW = preset["per_row"]
    COL_WIDTH = preset["col_width"]

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=10 * mm,
        rightMargin=10 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
    )

    parts = [codes[i : i + PER_FILE] for i in range(0, len(codes), PER_FILE)]
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
                ("ALIGN",(0,0),(-1,-1),"CENTER"),
                ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                ("LEFTPADDING",(0,0),(-1,-1),8),
                ("RIGHTPADDING",(0,0),(-1,-1),8),
                ("TOPPADDING",(0,0),(-1,-1),10),
                ("BOTTOMPADDING",(0,0),(-1,-1),18),
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
