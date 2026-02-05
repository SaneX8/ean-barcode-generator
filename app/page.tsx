"use client";

import { useState } from "react";

export default function Home() {
  const [codes, setCodes] = useState("");
  const [preset, setPreset] = useState("4");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const dark = theme === "dark";

  async function generate() {
    if (!codes.trim()) {
      alert("No EAN codes!");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codes, preset }),
        },
      );

      if (!res.ok) {
        const txt = await res.text();
        alert("Backend error: " + txt);
        setLoading(false);
        return;
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
    } catch (err) {
      alert("Could not connect to backend!");
      console.error(err);
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
      {/* TOP BAR */}
      <div
        className={`w-full max-w-xl flex items-center justify-between px-2 py-2 ${
          dark ? "text-white" : "text-zinc-800"
        }`}
      >
        <div className="flex items-center gap-2 font-semibold">
          📦
          <span>EAN Generator</span>
        </div>

        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          className={`px-3 py-1 rounded-lg border ${
            dark
              ? "border-zinc-600 hover:bg-zinc-800"
              : "border-zinc-300 hover:bg-white"
          }`}
        >
          {dark ? "☀ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* CARD */}
      <div
        className={`w-full max-w-xl backdrop-blur rounded-2xl shadow-2xl border p-6 md:p-8 mt-4 transition-colors ${
          dark ? "bg-zinc-900/80 border-zinc-700" : "bg-white border-zinc-300"
        }`}
      >
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            EAN Barcode Generator
          </h1>
          <p
            className={`text-sm mt-1 ${
              dark ? "text-zinc-400" : "text-zinc-600"
            }`}
          >
            Generate printable barcode sheets from EAN codes.
          </p>
        </div>

        {/* PRESET */}
        <div className="mb-4">
          <label className="block text-sm mb-1">Layout preset</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className={`w-full rounded-lg border p-2 ${
              dark ? "bg-zinc-950 border-zinc-700" : "bg-white border-zinc-300"
            }`}
          >
            <option value="4">A4 – 4 per row (standard)</option>
            <option value="3">A4 – 3 per row (large)</option>
            <option value="6">A4 – 6 per row (compact)</option>
          </select>
        </div>

        {/* FILE UPLOAD */}
        <div className="mb-4">
          <label className="block text-sm mb-1">Upload CSV / TXT</label>

          <div className="flex items-center gap-3">
            <label
              className={`cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition ${
                dark
                  ? "bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                  : "bg-white border-zinc-300 hover:bg-zinc-100"
              }`}
            >
              Choose file
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) =>
                  e.target.files && handleFileUpload(e.target.files[0])
                }
              />
            </label>

            <span className="text-xs text-zinc-400">
              {codes ? "Loaded" : "No file selected"}
            </span>
          </div>
        </div>

        {/* TEXTAREA */}
        <div className="mb-5">
          <label className="block text-sm mb-1">EAN codes (one per line)</label>
          <textarea
            className={`w-full h-56 rounded-xl border p-3 font-mono text-sm resize-none ${
              dark ? "bg-zinc-950 border-zinc-700" : "bg-white border-zinc-300"
            }`}
            placeholder={`6415712400071
7340191139510
6408110004729`}
            value={codes}
            onChange={(e) => setCodes(e.target.value)}
          />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            onClick={generate}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl font-medium text-lg flex items-center justify-center gap-2 transition ${
              dark
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {loading && (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? "Generating…" : "Generate PDF"}
          </button>

          <button
            onClick={clearCodes}
            disabled={loading || !codes}
            className={`px-4 rounded-xl border ${
              dark
                ? "border-zinc-600 hover:bg-zinc-800"
                : "border-zinc-300 hover:bg-zinc-200"
            }`}
          >
            Clear
          </button>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-20 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* FOOTER */}
      <footer className="text-xs text-zinc-500 mt-8">
        © {new Date().getFullYear()} Santeri Pikkarainen
      </footer>
    </main>
  );
}
