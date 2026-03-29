"use client";

import { useState, useMemo } from "react";
import AgentLog from "../components/AgentLog";
import CollateralModal from "../components/CollateralModal";

type Status =
  | "New"
  | "Scanning"
  | "Attested"
  | "Pending Approval"
  | "Listed"
  | "Sold";

type AssetType =
  | "Residential"
  | "Commercial"
  | "Industrial"
  | "Retail"
  | "Equipment"
  | "Vehicle"
  | "Agricultural";

interface Asset {
  id: number;
  type: AssetType;
  label: string;
  location: string;
  defaultDays: number;
  loan: string;
  loanNum: number;
  value: string;
  valueNum: number;
  ltv: string;
  status: Status;
  grade?: string;
}

const assets: Asset[] = [
  {
    id: 1,
    type: "Residential",
    label: "3-bed terraced house",
    location: "SW London",
    defaultDays: 94,
    loan: "£1.0M",
    loanNum: 1000000,
    value: "£2.0M",
    valueNum: 2000000,
    ltv: "50%",
    status: "Pending Approval",
    grade: "A",
  },
  {
    id: 2,
    type: "Commercial",
    label: "Office block — 12 units",
    location: "Manchester",
    defaultDays: 121,
    loan: "£2.4M",
    loanNum: 2400000,
    value: "£4.1M",
    valueNum: 4100000,
    ltv: "59%",
    status: "Listed",
    grade: "A",
  },
  {
    id: 3,
    type: "Industrial",
    label: "Warehouse facility",
    location: "Birmingham",
    defaultDays: 67,
    loan: "£0.8M",
    loanNum: 800000,
    value: "£1.5M",
    valueNum: 1500000,
    ltv: "53%",
    status: "Scanning",
  },
  {
    id: 4,
    type: "Equipment",
    label: "CNC milling fleet (x8)",
    location: "Sheffield",
    defaultDays: 103,
    loan: "£340K",
    loanNum: 340000,
    value: "£620K",
    valueNum: 620000,
    ltv: "55%",
    status: "Attested",
    grade: "B+",
  },
  {
    id: 5,
    type: "Retail",
    label: "High street unit — 3 floors",
    location: "Leeds",
    defaultDays: 180,
    loan: "£3.1M",
    loanNum: 3100000,
    value: "£5.8M",
    valueNum: 5800000,
    ltv: "53%",
    status: "Sold",
    grade: "A",
  },
  {
    id: 6,
    type: "Vehicle",
    label: "HGV fleet (x14)",
    location: "Coventry",
    defaultDays: 91,
    loan: "£480K",
    loanNum: 480000,
    value: "£710K",
    valueNum: 710000,
    ltv: "68%",
    status: "New",
  },
  {
    id: 7,
    type: "Agricultural",
    label: "120-acre arable farmland",
    location: "Norfolk",
    defaultDays: 145,
    loan: "£1.8M",
    loanNum: 1800000,
    value: "£3.2M",
    valueNum: 3200000,
    ltv: "56%",
    status: "Attested",
    grade: "A",
  },
  {
    id: 8,
    type: "Commercial",
    label: "Mixed-use development",
    location: "Bristol",
    defaultDays: 78,
    loan: "£5.2M",
    loanNum: 5200000,
    value: "£8.9M",
    valueNum: 8900000,
    ltv: "58%",
    status: "New",
  },
  {
    id: 9,
    type: "Residential",
    label: "Detached villa",
    location: "São Paulo",
    defaultDays: 102,
    loan: "R$1.2M",
    loanNum: 1200000,
    value: "R$2.5M",
    valueNum: 2500000,
    ltv: "48%",
    status: "Pending Approval",
    grade: "A",
  },
  {
    id: 10,
    type: "Equipment",
    label: "Medical imaging suite",
    location: "Edinburgh",
    defaultDays: 112,
    loan: "£920K",
    loanNum: 920000,
    value: "£1.4M",
    valueNum: 1400000,
    ltv: "66%",
    status: "Scanning",
  },
];

const allTypes: AssetType[] = [
  "Residential",
  "Commercial",
  "Industrial",
  "Retail",
  "Equipment",
  "Vehicle",
  "Agricultural",
];

const allStatuses: Status[] = [
  "New",
  "Scanning",
  "Attested",
  "Pending Approval",
  "Listed",
  "Sold",
];

const statusColor: Record<Status, string> = {
  New: "text-muted",
  Scanning: "text-accent",
  Attested: "text-foreground",
  "Pending Approval": "text-accent",
  Listed: "text-success",
  Sold: "text-muted-light",
};

const statusDot: Record<Status, string> = {
  New: "bg-muted",
  Scanning: "bg-accent",
  Attested: "bg-foreground",
  "Pending Approval": "bg-accent",
  Listed: "bg-success",
  Sold: "bg-muted-light",
};

const modalData = {
  type: "Residential property",
  location: "London, Zone 2",
  grade: "A",
  valuation: "£2,000,000",
  loan: "£1,000,000",
  ltv: "50%",
  defaultDays: "94",
  legalStatus: "Enforcement commenced",
  timeline: "~60 days",
  netProceeds: "£800,000",
  issuer: "hsbc.rayls.eth",
  attestedAgo: "2h ago",
  sharePrice: "£1,000",
  sharesAvailable: 800,
  currency: "£",
};

type SortKey = "defaultDays" | "valueNum" | "loanNum";

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortKey>("defaultDays");

  const filtered = useMemo(() => {
    let result = [...assets];
    if (typeFilter !== "All") {
      result = result.filter((a) => a.type === typeFilter);
    }
    if (statusFilter !== "All") {
      result = result.filter((a) => a.status === statusFilter);
    }
    result.sort((a, b) => {
      if (sortBy === "defaultDays") return b.defaultDays - a.defaultDays;
      if (sortBy === "valueNum") return b.valueNum - a.valueNum;
      return b.loanNum - a.loanNum;
    });
    return result;
  }, [typeFilter, statusFilter, sortBy]);

  const totalValue = assets.reduce((s, a) => s + a.valueNum, 0);
  const pipelineCount = assets.filter(
    (a) => a.status !== "Sold" && a.status !== "Listed"
  ).length;
  const listedCount = assets.filter((a) => a.status === "Listed").length;

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
              { value: `£${(totalValue / 1e6).toFixed(1)}M`, label: "Total value" },
              { value: String(assets.length), label: "Assets" },
              { value: String(pipelineCount), label: "In pipeline" },
              { value: String(listedCount), label: "Listed" },
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
              {allTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none"
            >
              <option value="All">All statuses</option>
              {allStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none"
            >
              <option value="defaultDays">Sort: default days</option>
              <option value="valueNum">Sort: value</option>
              <option value="loanNum">Sort: loan</option>
            </select>

            <span className="ml-auto text-[13px] text-muted">
              {filtered.length} asset{filtered.length !== 1 && "s"}
            </span>
          </div>
        </div>

        {/* Main content */}
        <div className="mx-auto w-full max-w-[1200px] px-8 pb-16">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Asset cards grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => {
                    if (
                      asset.status === "Pending Approval" ||
                      asset.status === "Listed"
                    )
                      setShowModal(true);
                  }}
                  className="group cursor-pointer rounded-2xl bg-card p-6 text-left transition-colors hover:bg-card-warm/50"
                >
                  {/* Top row: type + status */}
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                        {asset.type}
                      </span>
                      {asset.grade && (
                        <span
                          className={`ml-2 font-mono text-[10px] font-medium ${
                            asset.grade === "A"
                              ? "text-success"
                              : "text-accent"
                          }`}
                        >
                          {asset.grade}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusDot[asset.status]}`}
                      />
                      <span
                        className={`text-[11px] font-medium ${statusColor[asset.status]}`}
                      >
                        {asset.status}
                      </span>
                    </div>
                  </div>

                  {/* Label + location */}
                  <p className="text-[15px] font-medium text-foreground">
                    {asset.label}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {asset.location} &middot; {asset.defaultDays}d default
                  </p>

                  {/* Value row */}
                  <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                        Value
                      </p>
                      <p className="font-serif text-[22px] font-light tracking-tight text-foreground">
                        {asset.value}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                        Loan
                      </p>
                      <p className="font-mono text-[14px] text-muted">
                        {asset.loan}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                        LTV
                      </p>
                      <p className="font-mono text-[14px] text-foreground">
                        {asset.ltv}
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="col-span-2 py-16 text-center text-[14px] text-muted">
                  No assets match the selected filters.
                </div>
              )}
            </div>

            {/* Agent Log */}
            <div className="h-[600px] lg:sticky lg:top-20">
              <AgentLog />
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <CollateralModal
          data={modalData}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
