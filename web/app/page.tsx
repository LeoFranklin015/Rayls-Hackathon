import Link from "next/link";
import Accordion from "./components/Accordion";

const steps = [
  {
    num: "01",
    title: "Private asset deployment",
    description:
      "The bank deploys a DefaultedCollateral contract on their Rayls Privacy Node. Borrower name, address, loan history, legal filings \u2014 everything stays on a sovereign chain the bank fully controls. Nothing is visible externally.",
  },
  {
    num: "02",
    title: "AI attestation",
    description:
      "An AI agent reads the full collateral file via a scoped session key. It verifies property value against market data, confirms 90+ days non-payment, checks for encumbrances, calculates LTV, and runs an inference attack to ensure no public field reveals the borrower.",
  },
  {
    num: "03",
    title: "Human governance approval",
    description:
      "The AI submits a structured disclosure recommendation to the bank\u2019s internal governance contract. A compliance officer reviews the full borrower file, the AI\u2019s methodology, and confirms the tokenization is legally permissible. Approval is logged on-chain.",
  },
  {
    num: "04",
    title: "Bridge to Public L1",
    description:
      "A simplified PreLiquidationToken ERC-20 crosses the Rayls bridge to the Public L1. It carries only the AI-attested metadata \u2014 asset type, area, valuation, LTV, legal status. The property address, borrower details, and full legal file stay permanently on the Privacy Node.",
  },
  {
    num: "05",
    title: "Public marketplace",
    description:
      "Global investors purchase tokenized shares from \u00a31,000 minimum. When the property sells, the bank distributes proceeds to token holders atomically via DvP \u2014 payment and token redemption in one transaction. No escrow. No lawyers. No T+2 settlement.",
  },
];

const architecture = [
  {
    name: "Privacy Node",
    detail: "Sovereign EVM \u00b7 Full borrower file",
    bg: "bg-card-dark",
    text: "text-white",
    detailColor: "text-white/40",
  },
  {
    name: "AI Attestation Agent",
    detail: "Scoped session key \u00b7 Inference check",
    bg: "bg-card-accent",
    text: "text-white",
    detailColor: "text-white/60",
  },
  {
    name: "Rayls Bridge",
    detail: "Simplified ERC-20 \u00b7 Metadata only",
    bg: "bg-card-warm",
    text: "text-foreground",
    detailColor: "text-muted",
  },
  {
    name: "Public L1 Marketplace",
    detail: "Issuer verified \u00b7 DvP settlement",
    bg: "bg-card",
    text: "text-foreground",
    detailColor: "text-muted",
  },
];

const privateData = [
  { field: "Borrower name", reason: "GDPR / LGPD \u2014 personal identifier" },
  { field: "National ID", reason: "Strongest personal identifier" },
  { field: "Exact property address", reason: "Directly identifies borrower" },
  { field: "Full loan history", reason: "Banking secrecy law" },
  { field: "Legal correspondence", reason: "Client confidential" },
];

const publicData = [
  { field: "Property type", reason: "Category only \u2014 no identity risk" },
  { field: "General area", reason: "Not granular enough to re-identify" },
  { field: "AI valuation", reason: "Aggregate estimate" },
  { field: "LTV ratio", reason: "Standard investor metric" },
  { field: "Default days", reason: "Legal trigger confirmation" },
  { field: "Enforcement status", reason: "Binary \u2014 underway or not" },
  { field: "Issuer identity", reason: "Verified institution" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* ── Hero ── */}
      <section className="mx-auto w-full max-w-[1200px] px-8 pt-28 pb-24">
        <p className="mb-6 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
          Rayls EthCC Cannes &mdash; RWA Tokenization Track
        </p>

        <h1 className="font-serif text-[56px] leading-[1.08] font-normal tracking-[-0.02em] text-foreground sm:text-[72px]">
          Turn <span className="text-accent">idle collateral</span>
          <br />
          into instant liquidity
        </h1>

        <p className="mt-8 max-w-[600px] text-[17px] leading-[1.7] text-muted">
          Banks tokenize pre-liquidation property rights as shares.
          Investors earn yield. Borrower identity stays
          private&mdash;always.
        </p>
      </section>

      <div className="mx-auto w-full max-w-[1200px] border-t border-border px-8" />

      {/* ── How it works ── */}
      <section id="mechanism" className="mx-auto w-full max-w-[1200px] px-8 pt-20 pb-24">
        <p className="mb-10 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
          How it works
        </p>
        <Accordion items={steps} />
      </section>

      {/* ── Architecture ── */}
      <section className="mx-auto w-full max-w-[1200px] px-8 pb-28">
        <p className="mb-10 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
          Architecture
        </p>

        <div className="flex flex-col gap-3">
          {architecture.map((layer) => (
            <div
              key={layer.name}
              className={`flex items-center justify-between rounded-2xl px-8 py-7 ${layer.bg}`}
            >
              <span className={`text-[18px] font-medium ${layer.text}`}>
                {layer.name}
              </span>
              <span
                className={`font-mono text-[13px] ${layer.detailColor}`}
              >
                {layer.detail}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Disclosure ── */}
      <section
        id="disclosure"
        className="mx-auto w-full max-w-[1200px] px-8 pb-28"
      >
        <p className="mb-10 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
          Disclosure design
        </p>

        <div className="grid gap-16 sm:grid-cols-2">
          {/* Private column */}
          <div>
            <p className="mb-6 text-[13px] font-medium tracking-wide text-foreground uppercase">
              Private &mdash; stays on Privacy Node
            </p>
            <div>
              {privateData.map((item, i) => (
                <div
                  key={item.field}
                  className={`py-4 ${
                    i !== privateData.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <p className="text-[15px] text-foreground">{item.field}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Public column */}
          <div>
            <p className="mb-6 text-[13px] font-medium tracking-wide text-foreground uppercase">
              Public &mdash; visible on L1
            </p>
            <div>
              {publicData.map((item, i) => (
                <div
                  key={item.field}
                  className={`py-4 ${
                    i !== publicData.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <p className="text-[15px] text-foreground">{item.field}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-t border-border">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 sm:grid-cols-4">
          {[
            { value: "$1.5T", label: "Global idle collateral" },
            { value: "60d", label: "Avg. liquidation gap" },
            { value: "£1K", label: "Min. investment" },
            { value: "0", label: "Borrowers exposed" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`px-8 py-12 ${
                i < 3 ? "border-r border-border" : ""
              }`}
            >
              <p className="font-serif text-[36px] font-light tracking-tight text-foreground">
                {stat.value}
              </p>
              <p className="mt-1 text-[13px] text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-8 py-12">
          <p className="max-w-md text-[15px] leading-relaxed text-muted">
            The gap between &ldquo;right to liquidate&rdquo; and &ldquo;actual
            liquidation&rdquo; is where value dies. We make it productive.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="cursor-pointer rounded-xl bg-card-dark px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-80"
            >
              Bank Dashboard
            </Link>
            <Link
              href="/marketplace"
              className="cursor-pointer rounded-xl border border-foreground px-6 py-3 text-[14px] font-medium text-foreground transition-opacity hover:opacity-70"
            >
              Browse Market
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
