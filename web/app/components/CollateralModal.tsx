"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Lock, CheckCircle2, Loader2 } from "lucide-react";

interface CollateralData {
  type: string;
  location: string;
  grade: string;
  valuation: string;
  loan: string;
  ltv: string;
  defaultDays: string;
  legalStatus: string;
  timeline: string;
  netProceeds: string;
  issuer: string;
  attestedAgo: string;
  sharePrice: string;
  sharesAvailable: number;
  currency: string;
}

interface CollateralModalProps {
  data: CollateralData | null;
  onClose: () => void;
}

const protectedFields = [
  { label: "Borrower identity", reason: "GDPR protected" },
  { label: "Exact address", reason: "GDPR protected" },
  { label: "Loan history", reason: "Banking secrecy" },
  { label: "Legal correspondence", reason: "Confidential" },
];

export default function CollateralModal({
  data,
  onClose,
}: CollateralModalProps) {
  const [shares, setShares] = useState(10);
  const [buyState, setBuyState] = useState<
    "idle" | "submitting" | "confirmed"
  >("idle");

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

  if (!data) return null;

  const handleBuy = () => {
    setBuyState("submitting");
    setTimeout(() => setBuyState("confirmed"), 1200);
  };

  const total = shares * parseInt(data.sharePrice.replace(/[^0-9]/g, ""));

  const attestationRows = [
    { label: "Asset type", value: data.type },
    { label: "Location", value: data.location },
    { label: "AI valuation", value: data.valuation },
    { label: "Outstanding loan", value: data.loan },
    { label: "LTV ratio", value: data.ltv },
    { label: "Default confirmed", value: `${data.defaultDays} days` },
    { label: "Legal status", value: data.legalStatus },
    { label: "Expected timeline", value: data.timeline },
    { label: "Net proceeds floor", value: data.netProceeds },
  ];

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
              <h2 className="text-[17px] font-medium text-foreground">
                {data.type} &middot; {data.location}
              </h2>
              <span className="font-mono text-[12px] font-medium text-accent">
                {data.grade}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {data.issuer} &middot; AI attested {data.attestedAgo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 text-muted transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Attestation */}
          <div>
            <p className="mb-3 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">
              AI attestation &mdash; public data
            </p>
            <div>
              {attestationRows.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between py-3 ${
                    i !== attestationRows.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="text-[13px] text-muted">{row.label}</span>
                  <span className="font-mono text-[13px] text-foreground">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Protected Data */}
          <div>
            <p className="mb-3 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">
              Protected &mdash; private node only
            </p>
            <div className="rounded-xl bg-background p-4">
              {protectedFields.map((field, i) => (
                <div
                  key={field.label}
                  className={`flex items-center justify-between py-2.5 ${
                    i !== protectedFields.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="text-[13px] text-muted-light">
                    {field.label}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-light">
                    <Lock className="h-2.5 w-2.5" />
                    {field.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Buy Section */}
          <div className="border-t border-border pt-6">
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-background px-4 py-4 text-center">
                <p className="text-[11px] text-muted">Share price</p>
                <p className="mt-1 font-serif text-[24px] font-light text-foreground">
                  {data.currency}1,000
                </p>
              </div>
              <div className="rounded-xl bg-background px-4 py-4 text-center">
                <p className="text-[11px] text-muted">Available</p>
                <p className="mt-1 font-serif text-[24px] font-light text-foreground">
                  {data.sharesAvailable.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={data.sharesAvailable}
                value={shares}
                onChange={(e) =>
                  setShares(
                    Math.max(
                      1,
                      Math.min(data.sharesAvailable, parseInt(e.target.value) || 1)
                    )
                  )
                }
                className="w-20 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-[14px] text-foreground outline-none"
              />
              <span className="text-[13px] text-muted">
                shares &times; {data.currency}1,000 =
              </span>
              <span className="font-mono text-[15px] font-medium text-foreground">
                {data.currency}
                {total.toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleBuy}
              disabled={buyState !== "idle"}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-medium transition-all ${
                buyState === "confirmed"
                  ? "bg-success/10 text-success"
                  : buyState === "submitting"
                    ? "bg-background text-muted"
                    : "bg-card-dark text-white hover:opacity-80"
              } ${buyState !== "idle" ? "cursor-not-allowed" : ""}`}
            >
              {buyState === "idle" && "Buy shares"}
              {buyState === "submitting" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting transaction...
                </>
              )}
              {buyState === "confirmed" && (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Transaction confirmed
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
