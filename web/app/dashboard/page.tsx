"use client";

import { useState, useEffect, useMemo } from "react";
import { BrainCircuit } from "lucide-react";
import AgentLog from "../components/AgentLog";
import CollateralModal from "../components/CollateralModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const COL_TYPES = ["Land", "House", "Vehicle"] as const;

interface Collateral {
  id: number;
  ownerId: string;
  colType: string;
  info: string;
  loanAmount: string;      // ETH formatted
  loanAmountWei: string;
  interest: number;         // basis points
  yield_: number;           // basis points
  timeDays: number;
  startTimestamp: number;
  daysElapsed: number;
  totalValue: string;       // ETH formatted
  totalValueWei: string;
  ltv: number;              // percentage
  active: boolean;
  tokenized: boolean;
}

function formatValue(ethValue: string): string {
  const num = parseFloat(ethValue);
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
  return num.toFixed(2);
}

type Status = "Active" | "Tokenized";

const statusColor: Record<Status, string> = {
  Active: "text-accent",
  Tokenized: "text-success",
};

const statusDot: Record<Status, string> = {
  Active: "bg-accent",
  Tokenized: "bg-success",
};

type SortKey = "daysElapsed" | "totalValue" | "loanAmount";

export default function Dashboard() {
  const [assets, setAssets] = useState<Collateral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attestedMap, setAttestedMap] = useState<Record<number, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Collateral | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortKey>("daysElapsed");

  useEffect(() => {
    fetch(`${API_BASE}/collateral/all/active`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data) => setAssets(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (assets.length === 0) return;
    Promise.all(
      assets.map(async (a) => {
        try {
          const res = await fetch(`${API_BASE}/ai/attestations/${a.id}`);
          if (!res.ok) return { id: a.id, attested: false };
          const data = await res.json();
          return { id: a.id, attested: data.some((att: any) => att.approved && !att.revoked) };
        } catch {
          return { id: a.id, attested: false };
        }
      })
    ).then((results) => {
      const map: Record<number, boolean> = {};
      results.forEach((r) => { map[r.id] = r.attested; });
      setAttestedMap(map);
    });
  }, [assets]);

  const colTypes = useMemo(() => {
    const types = new Set(assets.map((a) => a.colType));
    return [...types].sort();
  }, [assets]);

  const filtered = useMemo(() => {
    let result = [...assets];
    if (typeFilter !== "All") {
      result = result.filter((a) => a.colType === typeFilter);
    }
    if (statusFilter !== "All") {
      if (statusFilter === "Active") result = result.filter((a) => !a.tokenized);
      if (statusFilter === "Tokenized") result = result.filter((a) => a.tokenized);
    }
    result.sort((a, b) => {
      if (sortBy === "daysElapsed") return b.daysElapsed - a.daysElapsed;
      if (sortBy === "totalValue") return parseFloat(b.totalValue) - parseFloat(a.totalValue);
      return parseFloat(b.loanAmount) - parseFloat(a.loanAmount);
    });
    return result;
  }, [assets, typeFilter, statusFilter, sortBy]);

  const totalValue = assets.reduce((s, a) => s + parseFloat(a.totalValue), 0);
  const tokenizedCount = assets.filter((a) => a.tokenized).length;
  const activeCount = assets.filter((a) => !a.tokenized).length;

  return (
    <>
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="mx-auto w-full max-w-[1200px] px-8 pt-16 pb-6">
          <p className="mb-1 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
            Privacy Node
          </p>
          <h1 className="font-serif text-[36px] font-light tracking-tight text-foreground">
            Collateral Portfolio
          </h1>
        </div>

        {/* Stats strip */}
        <div className="mx-auto w-full max-w-[1200px] border-t border-b border-border">
          <div className="grid grid-cols-4">
            {[
              { value: loading ? "..." : `${formatValue(totalValue.toString())} ETH`, label: "Total value" },
              { value: loading ? "..." : String(assets.length), label: "Assets" },
              { value: loading ? "..." : String(activeCount), label: "Active" },
              { value: loading ? "..." : String(tokenizedCount), label: "Tokenized" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`px-8 py-6 ${i < 3 ? "border-r border-border" : ""}`}
              >
                <p className="font-serif text-[24px] font-light tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="mx-auto w-full max-w-[1200px] px-8 py-6">
          <div className="flex items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none"
            >
              <option value="All">All types</option>
              {colTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none"
            >
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="Tokenized">Tokenized</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none"
            >
              <option value="daysElapsed">Sort: days elapsed</option>
              <option value="totalValue">Sort: value</option>
              <option value="loanAmount">Sort: loan</option>
            </select>

            <span className="ml-auto text-[13px] text-muted">
              {filtered.length} asset{filtered.length !== 1 && "s"}
            </span>
          </div>
        </div>

        {/* Main content */}
        <div className="mx-auto w-full max-w-[1200px] px-8 pb-16">
          {loading && (
            <div className="py-16 text-center text-[14px] text-muted">
              Loading collateral from private node...
            </div>
          )}

          {error && (
            <div className="py-16 text-center text-[14px] text-accent">
              Failed to load: {error}. Make sure the backend is running.
            </div>
          )}

          {!loading && !error && (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* Asset cards grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((asset) => {
                  const status: Status = asset.tokenized ? "Tokenized" : "Active";

                  return (
                    <div
                      key={asset.id}
                      className="group rounded-2xl bg-card p-6 text-left transition-colors hover:bg-card-warm/50"
                    >
                      {/* Top row: type + status */}
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                            {asset.colType}
                          </span>
                          <span className="ml-2 font-mono text-[10px] font-medium text-muted">
                            #{asset.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} />
                          <span className={`text-[11px] font-medium ${statusColor[status]}`}>
                            {status}
                          </span>
                          {attestedMap[asset.id] && (
                            <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                              Attested
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info + details */}
                      <button
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShowModal(true);
                        }}
                        className="cursor-pointer text-left"
                      >
                        <p className="text-[15px] font-medium text-foreground">
                          {asset.info || `${asset.colType} collateral`}
                        </p>
                        <p className="mt-0.5 text-[13px] text-muted">
                          {asset.interest / 100}% interest &middot; {asset.yield_ / 100}% yield &middot; {asset.daysElapsed}d elapsed
                        </p>
                      </button>

                      {/* Value row */}
                      <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                            Total Value
                          </p>
                          <p className="font-serif text-[22px] font-light tracking-tight text-foreground">
                            {formatValue(asset.totalValue)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                            Loan
                          </p>
                          <p className="font-mono text-[14px] text-muted">
                            {formatValue(asset.loanAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                            LTV
                          </p>
                          <p className="font-mono text-[14px] text-foreground">
                            {asset.ltv}%
                          </p>
                        </div>
                      </div>

                      {/* Analyse button */}
                      {!asset.tokenized && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const fn = (window as any).__agentLogStartAnalysis;
                              if (fn) fn(asset.id);
                            }}
                            title="Analyse with AI Swarm"
                            className="cursor-pointer rounded-lg bg-card-dark p-2 text-white transition-colors hover:bg-card-dark/80"
                          >
                            <BrainCircuit size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filtered.length === 0 && !loading && (
                  <div className="col-span-2 py-16 text-center text-[14px] text-muted">
                    {assets.length === 0
                      ? "No collateral registered on the private node yet."
                      : "No assets match the selected filters."}
                  </div>
                )}
              </div>

              {/* Agent Log */}
              <div className="h-[600px] lg:sticky lg:top-20">
                <AgentLog />
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedAsset && (
        <CollateralModal
          data={{
            type: `${selectedAsset.colType} collateral`,
            location: "-",
            grade: "-",
            valuation: `${formatValue(selectedAsset.totalValue)} ETH`,
            loan: `${formatValue(selectedAsset.loanAmount)} ETH`,
            ltv: `${selectedAsset.ltv}%`,
            defaultDays: String(selectedAsset.daysElapsed),
            legalStatus: selectedAsset.tokenized ? "Tokenized" : "Active",
            timeline: `${selectedAsset.timeDays}d loan duration`,
            netProceeds: `${formatValue(selectedAsset.totalValue)} ETH`,
            issuer: "bank.rayls.eth",
            attestedAgo: "-",
            sharePrice: "-",
            sharesAvailable: 0,
            currency: "ETH",
          }}
          onClose={() => { setShowModal(false); setSelectedAsset(null); }}
        />
      )}
    </>
  );
}
