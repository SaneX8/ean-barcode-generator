# 📦 EAN Barcode Generator

A production-ready web application for generating GS1-compliant EAN
barcode PDF sheets.

Built with **Next.js 16 + Flask + ReportLab**.\
Designed for clean A4 print layouts and reliable barcode scanning.

---

## ✨ Features

- Generate A4 barcode sheets
- 3 / 4 / 6 barcodes per row
- GS1-compliant EAN-13 sizing
- EAN-8 support
- Optional product name under barcode
- Automatic name wrapping
- Duplicate removal
- Safe backend parsing (invalid lines are ignored)
- Clean professional print layout
- Date-based export filename

---

## 📄 Supported Input Formats

### Plain EAN list

    5901234123457
    7351234567890
    4006381333931
    9780201379624

### Product Name + EAN pairs

    Sample Product Alpha
    5901234123457
    Demo Item Beta
    7351234567890
    Test Product Gamma
    4006381333931

The parser automatically detects whether a line is: - A valid EAN (8 or
13 digits) - A product name preceding an EAN

---

## 🖥 Tech Stack

### Frontend

- Next.js 16
- TypeScript
- Tailwind CSS

### Backend

- Flask
- ReportLab
- Gunicorn

---

## 📏 Barcode Technical Specs

- X-dimension: 0.42mm
- Bar height: 20mm
- Quiet zone enabled
- Human-readable text enabled
- Standard-compliant proportions

---

## 📦 Output

- A4 PDF
- Balanced spacing between items
- Auto-wrapped product names (max 2 lines)
- Minimal and print-optimized layout
- File name format:

```{=html}
<!-- -->
```

    barcodes_YYYY-MM-DD.pdf

---

## 🛠 Local Development

### Install Frontend

    npm install
    npm run dev

Runs at:

    http://localhost:3000

### Install Backend

    pip install -r requirements.txt
    python app.py

Runs at:

    http://localhost:5000

---

## 🌐 Environment Variable

Create `.env.local`:

    NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

---

## 🚀 Deployment (Render Example)

Start command:

    gunicorn app:app

Root directory:

    /

---
