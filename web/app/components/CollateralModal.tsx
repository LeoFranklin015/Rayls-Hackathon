"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Lock, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { encodeFunctionData, parseEther, type Address } from "viem";
import { useWallet } from "../lib/wallet-context";
import { sendTransaction } from "../lib/transactions";

const MARKETPLACE_ADDRESS = (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ||
  "0x58F1e005650c92A90E879c34c846B95dF6e03343") as Address;

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
  // For real buy flow
  listingId?: number;
  priceWei?: string;
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
  const [shares, setShares] = useState(1);
  const [buyState, setBuyState] = useState<
    "idle" | "submitting" | "confirmed" | "error"
  >("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const wallet = useWallet();

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

  const handleBuy = async () => {
    if (!wallet.account) {
      setBuyError("Connect your passkey wallet first");
      return;
    }
    if (data.listingId === undefined || !data.priceWei) {
      setBuyError("Missing listing data");
      return;
    }

    setBuyState("submitting");
    setBuyError(null);
    try {
      const calldata = encodeFunctionData({
        abi: [
          {
            name: "buyFraction",
            type: "function",
            stateMutability: "payable",
            inputs: [
              { name: "listingId", type: "uint256" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [],
          },
        ],
        functionName: "buyFraction",
        args: [BigInt(data.listingId), BigInt(shares)],
      });

      const totalWei = BigInt(data.priceWei) * BigInt(shares);
      const hash = await sendTransaction(
        wallet.account,
        MARKETPLACE_ADDRESS,
        totalWei,
        calldata
      );
      setTxHash(hash);
      setBuyState("confirmed");
    } catch (e: any) {
      setBuyError(e.message || "Transaction failed");
      setBuyState("error");
    }
  };

  const attestationRows = [
    { label: "AI valuation", value: data.valuation },
    ...(data.loan !== "-" ? [{ label: "Outstanding loan", value: data.loan }] : []),
    ...(data.ltv !== "-" ? [{ label: "LTV ratio", value: data.ltv }] : []),
    ...(data.defaultDays !== "-" ? [{ label: "Default confirmed", value: `${data.defaultDays} days` }] : []),
    { label: "Legal status", value: data.legalStatus },
    ...(data.timeline !== "-" ? [{ label: "Expected timeline", value: data.timeline }] : []),
    ...(data.netProceeds !== "-" ? [{ label: "Net proceeds floor", value: data.netProceeds }] : []),
  ].filter((r) => r.value && r.value !== "-");

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
                {data.type}
              </h2>
              {data.grade !== "-" && (
                <span className="font-mono text-[12px] font-medium text-accent">
                  {data.grade}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {data.issuer}
              {data.attestedAgo !== "-" && <> &middot; AI attested {data.attestedAgo}</>}
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
          {/* AI Attestation — public data only */}
          {attestationRows.length > 0 && (
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
          )}

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
          {data.sharesAvailable > 0 && (
            <div className="border-t border-border pt-6">
              <div className="mb-5 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-background px-4 py-4 text-center">
                  <p className="text-[11px] text-muted">Price per fraction</p>
                  <p className="mt-1 font-serif text-[20px] font-light text-foreground">
                    {data.sharePrice}
                  </p>
                </div>
                <div className="rounded-xl bg-background px-4 py-4 text-center">
                  <p className="text-[11px] text-muted">Available</p>
                  <p className="mt-1 font-serif text-[20px] font-light text-foreground">
                    {data.sharesAvailable.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Wallet connection — required for buying */}
              {!wallet.isConnected && (
                <div className="mb-4 rounded-xl bg-card-dark p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="h-4 w-4 text-white/60" />
                    <span className="text-[13px] font-medium text-white">
                      Connect passkey wallet to buy
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => wallet.connect()}
                      disabled={wallet.isConnecting}
                      className="flex-1 cursor-pointer rounded-lg bg-white/10 px-4 py-2.5 text-[12px] font-medium text-white hover:bg-white/20 disabled:opacity-50"
                    >
                      {wallet.isConnecting ? "Connecting..." : "Login with Passkey"}
                    </button>
                    <button
                      onClick={() => {
                        const name = prompt("Enter a name for your new passkey wallet:");
                        if (name) wallet.create(name);
                      }}
                      disabled={wallet.isConnecting}
                      className="flex-1 cursor-pointer rounded-lg border border-white/20 px-4 py-2.5 text-[12px] font-medium text-white/70 hover:bg-white/10 disabled:opacity-50"
                    >
                      Create New Wallet
                    </button>
                  </div>
                  {wallet.error && (
                    <p className="mt-2 text-[11px] text-red-400">{wallet.error}</p>
                  )}
                </div>
              )}

              {wallet.isConnected && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-success-bg p-3">
                  <Wallet className="h-4 w-4 text-success" />
                  <span className="text-[12px] text-success">
                    {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                  </span>
                  <button
                    onClick={wallet.disconnect}
                    className="ml-auto cursor-pointer text-[11px] text-muted hover:text-foreground"
                  >
                    Disconnect
                  </button>
                </div>
              )}

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
                  fractions
                </span>
              </div>

              <button
                onClick={handleBuy}
                disabled={!wallet.isConnected || buyState === "submitting" || buyState === "confirmed"}
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-medium transition-all ${
                  buyState === "confirmed"
                    ? "bg-success/10 text-success"
                    : buyState === "error"
                      ? "bg-warning-bg text-warning"
                      : buyState === "submitting"
                        ? "bg-background text-muted"
                        : !wallet.isConnected
                          ? "bg-background text-muted cursor-not-allowed"
                          : "bg-card-dark text-white hover:opacity-80"
                } ${!wallet.isConnected || buyState === "submitting" || buyState === "confirmed" ? "cursor-not-allowed" : ""}`}
              >
                {buyState === "idle" && (
                  wallet.isConnected
                    ? "Buy fractions on-chain"
                    : "Connect wallet to buy"
                )}
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
                {buyState === "error" && "Retry"}
              </button>

              {txHash && (
                <p className="mt-2 text-center font-mono text-[11px] text-muted">
                  TX:{" "}
                  <a
                    href={`https://testnet-explorer.rayls.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline hover:text-foreground"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </p>
              )}

              {buyError && (
                <p className="mt-2 text-center text-[11px] text-warning">
                  {buyError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
