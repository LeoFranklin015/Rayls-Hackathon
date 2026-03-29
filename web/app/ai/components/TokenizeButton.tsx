"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function TokenizeButton({ collateralId }: { collateralId: number }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleTokenize() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/ai/tokenize/${collateralId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Tokenization failed");
      }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
        <p className="font-semibold text-green-800 dark:text-green-300 mb-2">
          Tokenization Successful
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <span>Fractions:</span><span className="font-mono">{result.totalFractions}</span>
          <span>Price/Token:</span><span className="font-mono">{result.pricePerToken} USDR</span>
          <span>Adjusted Value:</span><span className="font-mono">{result.adjustedValue} USDR</span>
          <span>Avg Confidence:</span><span className="font-mono">{result.aiEvaluation.averageConfidence}%</span>
          <span>Tokenize TX:</span><span className="font-mono text-xs break-all">{result.txHashes.tokenize}</span>
          <span>Bridge TX:</span><span className="font-mono text-xs break-all">{result.txHashes.bridge}</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">{result.note}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleTokenize}
        disabled={loading}
        className="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Tokenizing..." : "Start Tokenization"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
