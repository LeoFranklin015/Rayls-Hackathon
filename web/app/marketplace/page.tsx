"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import CollateralModal from "../components/CollateralModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface PublicListing {
  listingId: number;
  token: string;
  assetType: number;
  tokenId: string;
  amount: string;       // fractions remaining
  price: string;        // USDR formatted price per fraction
  priceWei: string;
  active: boolean;
  collateral?: {
    bankName: string;
    collateralId: string;
    maxTokenCount: string;
    totalValue: string;   // USDR
    yieldBasisPoints: number;
    filled: boolean;
    fractionsSold: string;
  };
}

function formatETH(val: string): string {
  const num = parseFloat(val);
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M USDR`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K USDR`;
  if (num >= 1) return `${num.toFixed(2)} USDR`;
  return `${num.toFixed(4)} USDR`;
}

function ListingCard({ listing, onClick }: { listing: PublicListing; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group cursor-pointer rounded-2xl bg-card p-6 text-left transition-colors hover:bg-card-warm/50"
    >
      {/* ID + type */}
      <div className="mb-5 flex items-center justify-between">
        <span className="font-mono text-[12px] text-muted">
          Listing #{listing.listingId}
        </span>
        <span className="font-mono text-[11px] font-medium text-success">
          {listing.assetType === 2 ? "ERC-1155" : listing.assetType === 1 ? "ERC-721" : "ERC-20"}
        </span>
      </div>

      {/* Total value — hero */}
      {listing.collateral ? (
        <>
          <p className="font-serif text-[32px] font-light tracking-tight text-foreground">
            {formatETH(listing.collateral.totalValue)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {parseInt(listing.amount).toLocaleString()} fractions at {formatETH(listing.price)} each
          </p>
        </>
      ) : (
        <>
          <p className="font-serif text-[32px] font-light tracking-tight text-foreground">
            {formatETH(listing.price)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {parseInt(listing.amount).toLocaleString()} available
          </p>
        </>
      )}

      {/* Key metrics — public data only */}
      {listing.collateral && (
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.15em] text-muted uppercase">
              Yield
            </p>
            <p className="font-mono text-[14px] text-foreground">
              {listing.collateral.yieldBasisPoints / 100}%
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] tracking-[0.15em] text-muted uppercase">
              Fractions
            </p>
            <p className="font-mono text-[14px] text-foreground">
              {listing.collateral.maxTokenCount}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] tracking-[0.15em] text-muted uppercase">
              Sold
            </p>
            <p className="font-mono text-[14px] text-foreground">
              {listing.collateral.fractionsSold}
            </p>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-[11px] text-muted">
          {listing.collateral?.bankName || "Token"}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${listing.collateral?.filled ? "bg-muted" : "bg-success"}`} />
          <span className={`text-[11px] font-medium ${listing.collateral?.filled ? "text-muted" : "text-success"}`}>
            {listing.collateral?.filled ? "Filled" : "Active"}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function Marketplace() {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<PublicListing | null>(null);
  const [sortBy, setSortBy] = useState<"amount" | "price" | "yield">("amount");

  useEffect(() => {
    fetch(`${API_BASE}/investor/listings`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch listings");
        return r.json();
      })
      .then((data) => setListings(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sortFn = useCallback((a: PublicListing, b: PublicListing) => {
    if (sortBy === "amount") return parseInt(b.amount) - parseInt(a.amount);
    if (sortBy === "price") return parseFloat(b.price) - parseFloat(a.price);
    const yA = a.collateral?.yieldBasisPoints || 0;
    const yB = b.collateral?.yieldBasisPoints || 0;
    return yB - yA;
  }, [sortBy]);

  const activeListings = useMemo(() => {
    return [...listings].filter((l) => l.active && !l.collateral?.filled).sort(sortFn);
  }, [listings, sortFn]);

  const filledListings = useMemo(() => {
    return [...listings].filter((l) => l.collateral?.filled).sort(sortFn);
  }, [listings, sortFn]);

  const toModalData = (l: PublicListing) => ({
    type: `Listing #${l.listingId}`,
    location: "Withheld",
    grade: "-",
    valuation: l.collateral ? formatETH(l.collateral.totalValue) : "-",
    loan: "-",
    ltv: "-",
    defaultDays: "-",
    legalStatus: l.collateral?.filled ? "Filled" : "Active",
    timeline: "-",
    netProceeds: "-",
    issuer: l.collateral?.bankName || "Unknown",
    attestedAgo: "-",
    sharePrice: formatETH(l.price),
    sharesAvailable: parseInt(l.amount),
    currency: "",
    listingId: l.listingId,
    priceWei: l.priceWei,
  });

  return (
    <>
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="mx-auto w-full max-w-[1200px] px-8 pt-16 pb-6">
          <p className="mb-1 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
            Public L1
          </p>
          <h1 className="font-serif text-[36px] font-light tracking-tight text-foreground">
            Marketplace
          </h1>
        </div>

        {/* Filters */}
        <div className="mx-auto w-full max-w-[1200px] border-t border-border px-8 py-6">
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none"
            >
              <option value="amount">Sort: available fractions</option>
              <option value="price">Sort: price per fraction</option>
              <option value="yield">Sort: yield</option>
            </select>

            <span className="ml-auto text-[13px] text-muted">
              {activeListings.length + filledListings.length} listing{activeListings.length + filledListings.length !== 1 && "s"}
            </span>
          </div>
        </div>

        {/* Listings */}
        <div className="mx-auto w-full max-w-[1200px] px-8 pb-16">
          {loading && (
            <div className="py-16 text-center text-[14px] text-muted">
              Loading listings from public chain...
            </div>
          )}

          {error && (
            <div className="py-16 text-center text-[14px] text-accent">
              Failed to load: {error}. Make sure the backend is running.
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-10">
              {/* Active Listings */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <h2 className="font-mono text-[13px] tracking-[0.1em] text-foreground uppercase">
                    Active
                  </h2>
                  <span className="font-mono text-[12px] text-muted">
                    ({activeListings.length})
                  </span>
                </div>
                {activeListings.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {activeListings.map((listing) => (
                      <ListingCard key={listing.listingId} listing={listing} onClick={() => setSelected(listing)} />
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-[13px] text-muted">No active listings.</p>
                )}
              </div>

              {/* Filled Listings */}
              {filledListings.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-muted" />
                    <h2 className="font-mono text-[13px] tracking-[0.1em] text-foreground uppercase">
                      Filled
                    </h2>
                    <span className="font-mono text-[12px] text-muted">
                      ({filledListings.length})
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filledListings.map((listing) => (
                      <ListingCard key={listing.listingId} listing={listing} onClick={() => setSelected(listing)} />
                    ))}
                  </div>
                </div>
              )}

              {activeListings.length === 0 && filledListings.length === 0 && (
                <div className="py-16 text-center text-[14px] text-muted">
                  No listings on the public marketplace.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border">
          <div className="mx-auto w-full max-w-[1200px] px-8 py-10">
            <p className="text-[13px] leading-relaxed text-muted">
              All data sourced from Rayls Public L1. No private borrower data is
              exposed. Only tokenization metrics, yield, and bank issuer are
              disclosed. Fractions are ERC-1155 tokens tradeable on-chain.
            </p>
          </div>
        </div>
      </div>

      {selected && (
        <CollateralModal
          data={toModalData(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
