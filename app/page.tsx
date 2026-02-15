"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [codes, setCodes] = useState("");
  const [preset, setPreset] = useState("3");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("light");

  const dark = theme === "dark";

  useEffect(() => {
    document.title = loading
      ? "⏳ Generating PDF..."
      : "EAN Barcode Generator | Santeri Pikkarainen";
  }, [loading]);

  async function generate() {
    if (!codes.trim()) {
      alert("No data provided!");
      return;
    }

    setLoading(true);

    // Siistitään rivit mutta EI validoida numeroita frontendissa
    const cleanedLines = codes
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);

    if (cleanedLines.length === 0) {
      alert("No valid lines.");
      setLoading(false);
      return;
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const fullUrl = `${backendUrl}/generate`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const res = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codes: cleanedLines.join("\n"), // 🔥 Lähetetään kaikki rivit backendille
          preset,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Backend error");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "barcodes.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setToast("PDF ready ✓");
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      if (err.name === "AbortError") {
        alert("Server is waking up... please try again in a moment.");
      } else {
        alert("Something went wrong. Check backend connection.");
      }
    }

    setLoading(false);
  }

  function clearCodes() {
    setCodes("");
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text
        .split(/[\n,;]/)
        .map((l) => l.trim())
        .filter(Boolean);

      setCodes(lines.join("\n"));
    };
    reader.readAsText(file);
  }

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-between p-4 transition-colors ${
        dark
          ? "bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 text-white"
          : "bg-zinc-100 text-zinc-900"
      }`}
    >
      {/* Progress bar */}
      {loading && (
        <div className="fixed top-0 left-0 w-full h-1 bg-blue-500 animate-pulse z-50" />
      )}

      {/* TOP BAR */}
      <div className="w-full max-w-xl flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-3 font-semibold">
          📦 <span>EAN Generator</span>
          <a
            href="https://santeripikkarainen.com"
            className="ml-3 text-xs px-3 py-1 rounded-full border border-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
          >
            ← Portfolio
          </a>
        </div>

        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          className="px-3 py-1 rounded-lg border border-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
        >
          {dark ? "☀ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* CARD */}
      <div
        className={`w-full max-w-xl backdrop-blur rounded-2xl shadow-2xl border p-6 md:p-8 mt-4 ${
          dark ? "bg-zinc-900/80 border-zinc-700" : "bg-white border-zinc-300"
        }`}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            EAN Barcode Generator
          </h1>
          <p className="text-sm mt-1 opacity-70">
            Generate printable barcode sheets from EAN codes.
          </p>
        </div>

        {/* PRESET */}
        <div className="mb-4">
          <label className="block text-sm mb-1">Layout preset</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="w-full rounded-lg border p-2 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
          >
            <option value="4">A4 – 4 per row (standard)</option>
            <option value="3">A4 – 3 per row (large)</option>
            <option value="6">A4 – 6 per row (compact)</option>
          </select>
        </div>

        {/* FILE UPLOAD */}
        <div className="mb-4">
          <label className="block text-sm mb-1">Upload CSV / TXT</label>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) =>
              e.target.files && handleFileUpload(e.target.files[0])
            }
          />
        </div>

        {/* TEXTAREA */}
        <div className="mb-5">
          <label className="block text-sm mb-1">EAN codes (one per line)</label>
          <textarea
            className="w-full h-56 rounded-xl border p-3 font-mono text-sm resize-none bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
            value={codes}
            onChange={(e) => setCodes(e.target.value)}
          />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            onClick={generate}
            disabled={loading || !codes.trim()}
            className="flex-1 py-3 rounded-xl font-medium text-lg flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white transition disabled:opacity-50"
          >
            {loading && (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? "Generating…" : "Generate PDF"}
          </button>

          <button
            onClick={clearCodes}
            disabled={loading || !codes}
            className="px-4 rounded-xl border border-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <footer className="text-xs text-zinc-500 mt-8">
        © {new Date().getFullYear()} Santeri Pikkarainen
      </footer>
    </main>
  );
}
