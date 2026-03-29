<p align="center">
  <strong>COLLIQUID</strong>
  <br>
  <em>Pre-Liquidation Collateral Tokenization on Rayls</em>
</p>


<p align="center">
  <img src="https://img.shields.io/badge/Rayls-Hackathon-b5503a?style=flat-square" alt="Rayls Hackathon" />
  <img src="https://img.shields.io/badge/Track-RWA%20Tokenization-3a7d52?style=flat-square" alt="Track 1" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License" />
</p>

---

![ezgif-5f36a2a7cf31ddb5](https://github.com/user-attachments/assets/d024774c-8493-4ade-ad2a-4deb8c7dfa3f)


## The Problem

Banks hold **$1.5 trillion** in non-performing loan collateral globally. After a borrower defaults, the collateral sits idle for 60-180 days during legal liquidation proceedings. Banks can't sell it, lend against it, or generate yield from it.

They also can't tokenize it publicly because **borrower privacy laws** (GDPR, LGPD) prohibit disclosing who defaulted, and **investors need trusted verification** that the collateral is real without seeing the private data.

| Region | Non-Performing Loans |
|---|---|
| United States | $500B+ |
| European Union | $365B |
| Brazil | $37B |
| India | $50B+ |

**Colliquid solves both problems using Rayls privacy chains and AI verification.**

---

## How It Works

<img width="1160" height="888" alt="image" src="https://github.com/user-attachments/assets/000051c9-be26-497e-b972-403bce7f511a" />


### The 5-Step Pipeline (Fully Automated)

| Step | Chain | What Happens |
|------|-------|-------------|
| **Register** | Privacy | Bank creates loan with full borrower details |
| **Evaluate** | Off-chain | 5 AI agents analyze and vote on tokenization |
| **Attest** | Public | Sanitized verdict stored on-chain (no private data) |
| **Tokenize** | Privacy -> Public | 1000 ERC-1155 fractions minted and bridged |
| **List** | Public | Fractions listed on marketplace for investors |

One click triggers the entire pipeline. Results stream in real-time via SSE.

---

## Architecture

```
project/
  backend/          Express.js API server
    src/
      ai/           AI agent swarm + evaluation store
      api/          REST endpoints + SSE streaming
      shared/       Contract ABIs, providers, config

  web/              Next.js 16 frontend
    app/
      dashboard/    Bank portfolio (privacy node data)
      marketplace/  Public L1 marketplace (public data only)
      ai/           AI evaluation management

  contracts/        Solidity (Foundry)
    src/
      CollateralRegistry.sol    Loan data (privacy node)
      CollateralToken.sol       ERC-1155 fractions (privacy node)
      AIAttestation.sol         On-chain agent verdicts (public chain)
      Marketplace.sol           Fraction trading (public chain)
      RedemptionVault.sol       Yield distribution (public chain)

  account-abstraction/
    bundler/        ERC-4337 Skandha bundler
    entrypoint/     EntryPoint contract
    smartAccount/   JAW passkey wallets
```

---

## AI Agent Swarm

Five specialized agents evaluate each collateral. All must approve for tokenization.

| # | Agent | Role |
|---|-------|------|
| 1 | **Lead Analyst** | Initial assessment: loan terms, collateral type, yield viability |
| 2 | **Compliance Officer** | Regulatory review: eligible for tokenization, rates within limits |
| 3 | **Valuation Auditor** | Value verification: loan amount vs collateral type, math checks |
| 4 | **Risk Assessor** | Risk profile: LTV health, duration risk, yield sustainability |
| 5 | **Privacy Guardian** | PII check: ensures no borrower data leaks to public chain |

### Adversarial Review Pattern

Agent 1 evaluates first. Agents 2-5 receive Agent 1's reasoning + raw data and critique from their specialty. This catches blind spots a single agent would miss.

### What Goes On-Chain (Public)

```json
{
  "agents": [
    { "role": "lead-analyst", "approved": true, "confidence": 85 },
    { "role": "compliance-officer", "approved": true, "confidence": 80 },
    { "role": "valuation-auditor", "approved": true, "confidence": 85 },
    { "role": "risk-assessor", "approved": true, "confidence": 80 },
    { "role": "privacy-guardian", "approved": true, "confidence": 90 }
  ]
}
```

No loan amounts. No property descriptions. No borrower data. Only verdicts.

---

## The Privacy Split

| Data | Chain | Why |
|------|-------|-----|
| Borrower name / ID | **Private** | GDPR / LGPD |
| Exact property address | **Private** | Identifies borrower |
| Full loan history | **Private** | Banking secrecy |
| Internal legal docs | **Private** | Confidential |
| Yield / LTV / Duration | **Public** | Standard investor metrics |
| Default days | **Public** | Legal trigger confirmation |
| AI agent verdicts | **Public** | Trust verification |
| Bank issuer name | **Public** | Institutional identity |

---

## Live Deployment

| Service | URL |
|---------|-----|
| **Backend API** | https://rayls-hackathon.onrender.com |
| **ERC-4337 Bundler** | https://rayls-hackathon-1.onrender.com/rpc/ |

Set these as environment variables when running the frontend locally:

```bash
NEXT_PUBLIC_API_URL=https://rayls-hackathon.onrender.com
NEXT_PUBLIC_BUNDLER_URL=https://rayls-hackathon-1.onrender.com/rpc/
```

---

## Quick Start (Local)

### Prerequisites

- Node.js 18+
- Foundry (for contracts)
- OpenAI API key

### Backend

```bash
cd backend
cp .env.example .env    # Set OPENAI_API_KEY and contract addresses
npm install
npm start               # Starts API on port 3000
```

### Frontend

```bash
cd web
npm install
npm run dev             # Starts on port 3001
```

### Contracts

```bash
cd contracts
forge build
# Deploy to privacy node
source .env && forge script script/DeployCollateralRegistry.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
```

---

## Deployed Contracts

### Privacy Node (Chain 800005)

| Contract | Address |
|---|---|
| Collateral Registry | `0x3FA0e60FD69d0eb1a10e904E278D3E5953B42547` |
| Collateral Token | `0x375Ea700d5917727965A3444bb4fC3BaD4F5Db76` |

### Public Chain (Chain 7295799)

| Contract | Address |
|---|---|
| AI Attestation | `0x9FaD74E00B3326d901770A5203FE8FbA97DfCFAD` |
| Marketplace | `0x58F1e005650c92A90E879c34c846B95dF6e03343` |
| Public Collateral Token | `0x0E09ebc00C02e6f169C8B0D2c107C8C1f6AF7483` |
| Redemption Vault | `0x3bA4C6a5c73D512f50fd808f9ed0E35CF0bcF60f` |

### Block Explorers

- **Public Chain**: https://testnet-explorer.rayls.com
- **Privacy Node**: https://blockscout-privacy-node-5.rayls.com

---

## Why Rayls

This product is **impossible on standard public blockchains**. It requires:

- **Sovereign privacy per bank** -- each bank controls their own chain
- **Programmable disclosure** -- the bank decides exactly what crosses to public
- **Bridge architecture** -- simplified tokens cross, not raw assets
- **AI as trusted intermediary** -- reads private data, posts only sanitized verdicts

Rayls provides all four. Ethereum mainnet, standard L2s, and other chains do not.

---

<p align="center">
  <strong>Colliquid</strong> -- Unlocking $1.5 trillion in idle bank collateral
  <br><br>
  <a href="LICENSE">MIT License</a>
</p>


