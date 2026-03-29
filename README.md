# Pre-Liquidation Collateral Tokenization
### Rayls EthCC Cannes Hackathon — Track 1: RWA Tokenization

---

## The Problem

When a borrower stops repaying their loan, the bank holds collateral — property, commercial real estate, equipment — as security. After 90 days of non-payment, the bank has the legal right to liquidate that collateral and recover their money.

But the actual liquidation process — legal notices, enforcement proceedings, property auctions — takes another 60 to 180 days depending on jurisdiction.

During that entire period, the collateral sits completely idle on the bank's books. The bank cannot lend against it. Cannot generate yield from it. Cannot use it for anything. It is a dead asset.

**This is a global problem.** US banks hold over $500 billion in non-performing loans. European banks hold €365 billion. Every single one has collateral sitting in legal limbo right now.

**The gap between "right to liquidate" and "actual liquidation" is where billions of dollars of value go to waste every year.**

---

## Why It Hasn't Been Solved

Banks cannot simply sell or pledge this collateral publicly for two reasons:

**1. Borrower privacy laws**
GDPR in Europe, LGPD in Brazil, CCPA in California — every jurisdiction requires banks to protect borrower identity. The moment a bank publicly discloses "we have a defaulted loan on a property at 42 Rue de Rivoli, Paris" — they have exposed their client. That is a regulatory violation with serious penalties.

**2. No trusted verification mechanism**
Even if a bank wanted to raise liquidity against pre-liquidation collateral, investors need to trust:
- The property valuation is accurate
- The default status is real
- The legal process is genuinely underway
- No hidden encumbrances exist

Today, verifying all of this requires weeks of manual due diligence by lawyers and surveyors. There is no fast, trustless way to prove a collateral position is real without revealing the sensitive details behind it.

**Rayls solves both problems simultaneously.**

---

## The Solution

A bank tokenizes their pre-liquidation collateral on a Rayls Privacy Node — their own sovereign private chain. The complete borrower file, property details, and legal documents stay completely private.

An AI agent reads the private collateral data, verifies everything is legitimate, and posts a minimal public attestation on the Rayls Public L1 — enough for investors to make a confident decision, without revealing anything about the borrower.

Investors buy tokenized shares of the collateral position on the public marketplace. The bank gets liquidity now. When the property sells 60 days later, investors are repaid with yield. The borrower's identity is never revealed.

---

## How It Works — The 5 Steps

### Step 1 — Private Asset Deployment on Privacy Node

The bank deploys a `DefaultedCollateral` smart contract on their Rayls Privacy Node, owned by a JAW passkey-protected smart wallet.

This contract holds the complete private record:
- Borrower full name and national ID
- Exact property address and GPS coordinates
- Complete loan history and correspondence
- Internal property valuation reports and photos
- Legal filing details and enforcement status
- Structural survey and condition reports

**Nothing here is visible to anyone outside the bank.**

---

### Step 2 — AI Attestation

The AI agent reads the full collateral file via a scoped JAW session key. It performs real verification work:

- Verifies property value against current market data for the area
- Confirms 90+ days non-payment from payment history records
- Checks for any court injunctions or encumbrances blocking liquidation
- Calculates the Loan-to-Value ratio — outstanding loan vs verified property value
- Confirms jurisdiction-specific enforcement status is correctly underway
- Runs an inference attack check — could the public data reveal the borrower's identity?

The agent then posts a minimal attestation to the Rayls Public L1:

```
Asset type:          Commercial property
Location:            London, Zone 2 (area only — not address)
AI valuation:        £2,000,000
Outstanding loan:    £1,000,000
LTV ratio:           50%
Default status:      94 days confirmed
Legal status:        LPA Receiver Appointed
Jurisdiction:        England & Wales
Encumbrances:        None
Expected liquidation: 60 days
Grade:               A
Issuer:              hsbc.rayls.eth
```

The borrower name, exact address, and full loan history are stripped. The AI flags these as GDPR-protected fields.

---

### Step 3 — Governance and Human Approval

The AI agent submits a structured disclosure recommendation to the bank's internal governance contract on the Privacy Node.

The bank's legal and compliance officer reviews — privately — the full borrower file, the AI's methodology, and confirmation that the tokenization is legally permissible under applicable law.

The officer approves using their passkey via JAW. This approval is logged on-chain — timestamped, immutable, and legally attributable to a verified identity.

At any point, the compliance officer can revoke the AI agent's session key and halt the entire process.

---

### Step 4 — Bridge to Public L1

A simplified `PreLiquidationToken` ERC-20 crosses the Rayls bridge to the Public L1:

```
Name:             HSBC Pre-Liquidation Collateral #042
Issuer:           hsbc.rayls.eth
Asset type:       Commercial Property — London Zone 2
AI valuation:     £2,000,000
Loan outstanding: £1,000,000
LTV:              50%
Expected yield:   8% annualized
Maturity:         ~60 days
Grade:            A
Total supply:     1,500 tokens at £1,000 each
```

The property address, borrower details, and full legal file remain permanently on the Privacy Node.

---

### Step 5 — Public Marketplace

Investors globally can purchase tokens from £1,000 minimum — a product that previously required institutional minimums of £1M+.

The marketplace displays:
- AI attestation grade with methodology summary
- LTV ratio — 50% means the property must lose half its value before investors are at risk
- Legal enforcement status — confirmed, jurisdiction-specific
- Issuer identity via JustaName — `hsbc.rayls.eth` resolves to a verified, licensed, regulated institution
- Privacy proof panel — "Borrower identity protected under GDPR. Property address withheld. All other details AI-verified and on-chain."
- Countdown to expected liquidation

When the property sells, the bank distributes proceeds to token holders atomically via DvP — payment and token redemption happen in one transaction. No escrow. No lawyers. No T+2 settlement.

---

## The Data Split — Why Each Decision Matters

| Data | Private or Public | Reason |
|---|---|---|
| Borrower name | **Private** | GDPR / LGPD — personal identifier |
| National ID | **Private** | GDPR / LGPD — strongest personal identifier |
| Exact property address | **Private** | Directly identifies the borrower |
| Full loan history | **Private** | Banking secrecy law |
| Internal legal strategy | **Private** | Operational confidentiality |
| Legal correspondence | **Private** | Client confidential |
| Property type | **Public** | Category only — no identity risk |
| General area | **Public** | Not granular enough to re-identify |
| AI valuation | **Public** | Aggregate estimate — no raw appraisal |
| LTV ratio | **Public** | Standard investor metric |
| Default days | **Public** | Legal trigger confirmation |
| Enforcement status | **Public** | Binary — process is either underway or not |
| Expected timeline | **Public** | Investor planning information |
| Issuer identity | **Public** | JustaName verified institution |

The disclosure design reflects real institutional logic. Every public field has a clear investor need. Every private field has a clear legal protection requirement.

---

## The Role of JAW

**On the Privacy Node:**
- JAW master wallet owns the collateral contract — passkey-protected, no raw private key
- JustaPermissionManager issues scoped session keys to the AI agent:
  - Session Key 1: Read-only access to collateral data for attestation
  - Session Key 2: Write access to governance contract for recommendations
  - Session Key 3: Write access to attestation contract on Public L1 for status updates

**On the Public L1:**
- Session Key 3 is scoped only to metadata updates — cannot transfer funds or tokens
- 24-hour expiry — auto-revoked daily, must be re-issued
- Human compliance officer can revoke all three keys in one click

The AI agent monitors each collateral position daily. If the legal status changes — new court filing, property value drop, liquidation timeline extension — the agent detects it privately, updates the public token metadata, and triggers a governance review. The bank never loses oversight.

---

## The Role of JustaName

`hsbc.rayls.eth` resolves on the public marketplace to:

```
Institution:      HSBC Bank plc
Type:             Licensed bank
Regulator:        FCA (UK) / ECB (EU)
Rayls verified:   Yes
Active since:     2025-01-01
```

An investor in Singapore buying a London property-backed token trusts `hsbc.rayls.eth`. They would not trust `0x7a3b...f4c2`. JustaName is what makes the institutional identity verifiable without a phone call or a broker relationship.

---

## Why This Only Works on Rayls

On any standard public blockchain:
- Borrower data must either be exposed publicly or managed through a centralized database — defeating the purpose
- There is no sovereign private chain per institution — every bank shares the same ledger
- Proving data exists without revealing it requires complex ZK infrastructure that isn't production-ready

On Rayls:
- Each bank has their own Privacy Node — a sovereign EVM chain they fully control
- The AI agent can read private data and post only the safe summary publicly
- The bridge moves a simplified token, not the raw asset
- The disclosure is programmable — the bank decides exactly what crosses and when

**This is not possible on Ethereum mainnet. It is not possible on any standard L2. It requires exactly the architecture Rayls has built.**

---

## Market Size

This is not a niche use case.

| Region | Non-Performing Loans |
|---|---|
| United States | $500B+ |
| European Union | €365B |
| Brazil | $37B |
| India | $50B+ |
| Global total | ~$1.5 trillion |

Every dollar of NPL has collateral behind it. Most of that collateral is sitting idle in legal limbo right now. This idea unlocks a portion of that every single day.

---

## Why This Wins

**Sovereignty** — The borrower file never leaves the Privacy Node. The tokenization is impossible without the private chain. This is not a product that works on a standard public blockchain.

**Disclosure Design** — Every public field has an investor justification. Every private field has a legal protection requirement. The AI runs an inference attack to ensure no combination of public fields reveals the borrower's identity. The disclosure design reflects how banks actually think about client data.

**AI Integration** — The AI performs real financial analysis — property valuation, LTV calculation, legal status verification, encumbrance checking, inference attack simulation. Every output is an on-chain artifact with a session key signature. The AI's work is verifiable even though the underlying data is not.

**Public Market Viability** — A 60-day, AI-verified, 50% LTV-protected, institutionally-issued yield product is a real investment that real investors would buy. The JustaName identity removes the trust gap. The minimum ticket of £1,000 opens this to investors who have never had access to this asset class.

**Working Prototype** — One Privacy Node, one collateral contract, one AI agent, one governance dashboard, one public marketplace, one DvP settlement. Every step is visible on the explorer. The demo is clean and buildable in 2 days using JAW infrastructure already deployed on Rayls.

---

## Deployed Contract Addresses

### Privacy Node (Chain ID: 800005)

| Contract | Address |
|---|---|
| Philix Token (PHLX) | `0x3bA4C6a5c73D512f50fd808f9ed0E35CF0bcF60f` |
| Philix NFT (PNFT) | `0x3004c5386dB1b171dd101a218fD09B322a5F09aE` |
| Multi Token | `0x852D122cFAEBddD4bfa724D3E6d5E3D064457724` |
| Collateral Token | `0x375Ea700d5917727965A3444bb4fC3BaD4F5Db76` |
| Redemption Vault | `0x3bA4C6a5c73D512f50fd808f9ed0E35CF0bcF60f` |
| AI Attestation | `0x9FaD74E00B3326d901770A5203FE8FbA97DfCFAD` |
| Marketplace | `0x58F1e005650c92A90E879c34c846B95dF6e03343` |

### Public Chain (Chain ID: 7295799)

| Contract | Address |
|---|---|
| Collateral Registry | `0x3FA0e60FD69d0eb1a10e904E278D3E5953B42547` |
| Public Collateral Token | `0x0E09ebc00C02e6f169C8B0D2c107C8C1f6AF7483` |

---

## The One-Line Pitch

**"We unlocked $1.5 trillion in globally idle bank collateral — a bank tokenizes a pre-liquidation property privately, AI verifies the legal status and valuation without revealing the borrower's name, and global investors get a 60-day secured yield product for $1,000 minimum."**

---

## License

This project is licensed under the [MIT License](LICENSE).