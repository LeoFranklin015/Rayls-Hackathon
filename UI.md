# UI Spec — Colliquid

## Overview

A web app with 4 pages. Two sides:
- **Bank side** (reads from Rayls Privacy Node) — internal dashboard
- **Investor side** (reads from Rayls Public L1) — public marketplace

---

## Navigation

Top navbar with 4 links:
- Home
- Bank Dashboard
- Marketplace
- (Collateral Detail is a modal, not a nav item)

---

## Page 1 — Home

### Hero section
- Small pill badge: "Built on Rayls"
- H1: "Turn idle collateral into instant liquidity"
- Subtitle: "Banks tokenize pre-liquidation property rights as shares. Investors earn yield. Borrower identity stays private — always."
- Two CTA buttons: "Bank Dashboard" and "Browse Marketplace"

### Stats row (3 metric cards)
- Total collateral tokenized: £48.2M
- Active listings: 124
- Avg. yield per deal: 18.4%

### Feature cards (3 cards in a row)
1. **Private by default** — All borrower data stays on the bank's sovereign Privacy Node. Nothing crosses without approval.
2. **AI-verified claims** — Every listing is attested by an AI agent — valuation, LTV, default status, legal standing.
3. **Atomic settlement** — Shares bought and proceeds distributed in one transaction. No escrow, no delays, no lawyers.

---

## Page 2 — Bank Dashboard

Two-column layout: collateral table on the left, agent log on the right.

### Left — Collateral portfolio table

Header: "Collateral portfolio" + badge "Privacy Node"

Table columns: Property | Loan | Value | Status | Action

Table rows (mock data):
| Property | Loan | Value | Status | Action |
|---|---|---|---|---|
| Residential — SW London (default: 94 days) | £1.0M | £2.0M | Enforcement | Tokenize |
| Commercial — Manchester (default: 121 days) | £2.4M | £4.1M | Listed | View |
| Industrial — Birmingham (default: 67 days) | £0.8M | £1.5M | Pending | Review |
| Retail — Leeds (default: 180 days) | £3.1M | £5.8M | Sold | History |

Status badge colors:
- Enforcement → amber/warning
- Listed → green/success
- Pending → amber/warning
- Sold → gray

Clicking "Tokenize" on the first row opens the Collateral Detail modal.

### Right — Agent activity log

Header: "Agent activity" + green "Live" badge

Live scrolling log entries with timestamps. Each entry has:
- Timestamp (HH:MM:SS)
- Log message with key terms bolded

Log entries (in order):
1. `09:42:11` — Scanning portfolio for collateral exceeding **90-day** default threshold
2. `09:42:14` — Flagged **SW London residential** — 94 days overdue, enforcement active
3. `09:42:19` — Fetching market valuation for **Zone 2 residential** properties
4. `09:42:23` — Valuation confirmed: **£2,000,000**. LTV calculated: **50%**
5. `09:42:28` — Checking encumbrances — **none found**
6. `09:42:31` — Running inference attack on proposed public fields
7. `09:42:33` — Stripped: **exact_address**, **borrower_id** — GDPR risk
8. `09:42:35` — Attestation ready. Submitted to **compliance queue** for approval
9. `09:42:38` — Waiting for **compliance officer** approval... (green color)

New log entries should auto-append every few seconds to simulate live agent activity.

---

## Page 3 — Marketplace

Header row:
- Left: Title "Public marketplace" + subtitle "AI-attested collateral shares — fetched from Rayls Public L1"
- Right: Two dropdowns — "All jurisdictions" and "All grades"

### Listing cards grid (2-3 columns responsive)

Each card shows:
- Property type + location (top left)
- Grade badge (top right) — green for A, amber for B+
- Total raise amount (large)
- Share count + price per share
- 4 stats: LTV, Timeline, Yield, Issuer
- "AI attested · Xh ago" pill at bottom

Card data:

**Card 1**
- Residential · London Zone 2
- Grade A
- £800K raise · 800 shares at £1,000
- LTV 50% · 60 days · ~25% yield · hsbc.rayls.eth
- AI attested 2h ago

**Card 2**
- Commercial · Manchester
- Grade A
- £1.7M raise · 1,700 shares at £1,000
- LTV 59% · 45 days · ~18% yield · barclays.rayls.eth
- AI attested 5h ago

**Card 3**
- Industrial · Birmingham
- Grade B+
- £700K raise · 700 shares at £1,000
- LTV 53% · 90 days · ~14% yield · lloyds.rayls.eth
- AI attested 1d ago

**Card 4**
- Residential · São Paulo
- Grade A
- R$1.2M raise · 1,200 shares at R$1,000
- LTV 48% · 75 days · ~22% yield · bradesco.rayls.eth
- AI attested 3h ago

Clicking any card opens the Collateral Detail modal.

---

## Modal — Collateral Detail

Triggered by clicking a listing card or the Tokenize button on the bank dashboard.

Overlay with centered modal card.

### Header
- Title: "Residential · London Zone 2"
- Subtitle: "hsbc.rayls.eth · AI attested 2h ago"
- Grade A badge (top right)

### Section 1 — AI attestation (public data)
Label: "AI attestation — public data"
Background: slightly different from card (secondary bg)

Rows (label left, value right):
- Asset type → Residential property
- Location → London, Zone 2
- AI valuation → £2,000,000
- Outstanding loan → £1,000,000
- LTV ratio → 50%
- Default confirmed → 94 days
- Legal status → Enforcement commenced
- Expected timeline → ~60 days
- Net proceeds floor → £800,000

### Section 2 — Protected data
Label: "Protected — private node only"
Background: same secondary bg

Rows with locked pill on the right side:
- Borrower identity → [GDPR protected]
- Exact address → [GDPR protected]
- Loan history → [Banking secrecy]
- Legal correspondence → [Confidential]

The locked values should look visually distinct — muted pill/tag style, not readable text.

### Buy section

Two metric cards side by side:
- Share price: £1,000
- Shares available: 800

Share input row:
- Number input (default: 10, min: 1, max: 800)
- Label: "shares × £1,000 ="
- Live calculated total (updates as user types)

Buy button: "Buy shares" — full width, primary color

On click: button text changes to "Submitting transaction..." then "Transaction confirmed" after ~1.2 seconds.

---

## Design Notes

- Clean, minimal, flat design — no gradients, no shadows
- White cards on light gray background
- 0.5px borders throughout
- Two font weights only: 400 regular, 500 medium
- Color usage:
  - Blue → info, links, primary actions
  - Green → success, Grade A, listed status
  - Amber → warning, pending, Grade B+
  - Gray → neutral, sold, locked fields
- All text must work in both light and dark mode — use CSS variables, no hardcoded colors
- Responsive grid for listing cards
- Agent log should auto-scroll to bottom as new entries appear