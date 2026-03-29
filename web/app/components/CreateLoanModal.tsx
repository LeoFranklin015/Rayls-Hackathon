"use client";

import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle2, Loader2, Plus } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface CreateLoanModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const COL_TYPES = [
  { value: 0, label: "Land" },
  { value: 1, label: "House" },
  { value: 2, label: "Vehicle" },
];

export default function CreateLoanModal({ onClose, onCreated }: CreateLoanModalProps) {
  const [formState, setFormState] = useState<"idle" | "submitting" | "confirmed" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const [loanAmount, setLoanAmount] = useState("50");
  const [timeDays, setTimeDays] = useState("365");
  const [interest, setInterest] = useState("500");
  const [yield_, setYield] = useState("800");
  const [colType, setColType] = useState(1);
  const [info, setInfo] = useState("");
  const [daysAgo, setDaysAgo] = useState("120");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleSubmit = async () => {
    if (!loanAmount || !timeDays || !info) {
      setError("Fill in all required fields");
      return;
    }

    setFormState("submitting");
    setError(null);

    try {
      const startTimestamp = Math.floor(Date.now() / 1000) - parseInt(daysAgo) * 86400;
      const ownerId = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

      const res = await fetch(`${API_BASE}/bank/loan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          loanAmount,
          timeDays: parseInt(timeDays),
          interest: parseInt(interest),
          yield_: parseInt(yield_),
          colType,
          info,
          startTimestamp,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create loan");
      }

      const data = await res.json();
      setResult(data);
      setFormState("confirmed");
      onCreated();
    } catch (e: any) {
      setError(e.message);
      setFormState("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card p-6">
          <div>
            <div className="flex items-center gap-3">
              <Plus className="h-4 w-4 text-accent" />
              <h2 className="text-[17px] font-medium text-foreground">
                Register New Collateral
              </h2>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Add a loan to the privacy node registry
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 text-muted transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Collateral Type */}
          <div>
            <label className="block mb-1.5 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">
              Collateral Type
            </label>
            <div className="flex gap-2">
              {COL_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setColType(t.value)}
                  className={`flex-1 cursor-pointer rounded-xl py-2.5 text-[13px] font-medium transition-colors ${
                    colType === t.value
                      ? "bg-card-dark text-white"
                      : "bg-background text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1.5 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">
              Description *
            </label>
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder="Residential property, suburban area, good condition..."
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[13px] text-foreground placeholder:text-muted-light outline-none resize-none"
            />
          </div>

          {/* Loan Amount + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">
                Loan Amount (ETH) *
              </label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-[14px] text-foreground outline-none"
              />
            </div>
            <div>
              <label className="block mb-1.5 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">
                Duration (days)
              </label>
              <input
                type="number"
                value={timeDays}
                onChange={(e) => setTimeDays(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-[14px] text-foreground outline-none"
              />
            </div>
          </div>

          {/* Interest + Yield */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">
                Interest (basis pts)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-[14px] text-foreground outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                  {(parseInt(interest) / 100 || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <label className="block mb-1.5 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">
                Yield (basis pts)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={yield_}
                  onChange={(e) => setYield(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-[14px] text-foreground outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                  {(parseInt(yield_) / 100 || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Days ago (for backdating start) */}
          <div>
            <label className="block mb-1.5 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">
              Days since loan start
            </label>
            <input
              type="number"
              value={daysAgo}
              onChange={(e) => setDaysAgo(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-[14px] text-foreground outline-none"
            />
            <p className="mt-1 text-[11px] text-muted">
              How many days ago the loan started (for default period calculation)
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={formState === "submitting" || formState === "confirmed"}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-medium transition-all ${
              formState === "confirmed"
                ? "bg-success/10 text-success"
                : formState === "error"
                  ? "bg-warning-bg text-warning"
                  : formState === "submitting"
                    ? "bg-background text-muted"
                    : "bg-card-dark text-white hover:opacity-80"
            } ${formState === "submitting" || formState === "confirmed" ? "cursor-not-allowed" : ""}`}
          >
            {formState === "idle" && "Register Collateral"}
            {formState === "submitting" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting to privacy node...
              </>
            )}
            {formState === "confirmed" && (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Collateral #{result?.collateralId} registered
              </>
            )}
            {formState === "error" && "Retry"}
          </button>

          {result && (
            <div className="rounded-xl bg-success/5 p-3">
              <div className="grid grid-cols-2 gap-1 text-[12px]">
                <span className="text-muted">Collateral ID</span>
                <span className="font-mono text-foreground">#{result.collateralId}</span>
                <span className="text-muted">TX Hash</span>
                <span className="font-mono text-foreground text-[10px] break-all">{result.txHash}</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-center text-[12px] text-warning">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
