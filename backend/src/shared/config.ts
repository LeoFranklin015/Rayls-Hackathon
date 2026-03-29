import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

function req(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

function opt(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  // Network
  privacyNodeRpc: req("PRIVACY_NODE_RPC_URL"),
  publicChainRpc: req("PUBLIC_CHAIN_RPC_URL"),
  publicChainId: BigInt(opt("PUBLIC_CHAIN_ID", "7295799")),

  // Keys
  deployerPrivateKey: req("DEPLOYER_PRIVATE_KEY"),
  agentPrivateKey: opt("AGENT_PRIVATE_KEY", process.env.DEPLOYER_PRIVATE_KEY || ""),

  // Contract addresses
  tokenAddress: opt("TOKEN_ADDRESS", ""),
  nftAddress: opt("NFT_ADDRESS", ""),
  multiTokenAddress: opt("MULTI_TOKEN_ADDRESS", ""),
  attestationAddress: opt("ATTESTATION_ADDRESS", ""),
  marketplaceAddress: opt("MARKETPLACE_ADDRESS", ""),
  collateralTokenAddress: opt("COLLATERAL_TOKEN_ADDRESS", ""),
  collateralRegistryAddress: opt("COLLATERAL_REGISTRY_ADDRESS", ""),
  redemptionVaultAddress: opt("REDEMPTION_VAULT_ADDRESS", ""),
  publicCollateralTokenAddress: opt("PUBLIC_COLLATERAL_TOKEN_ADDRESS", ""),

  // User addresses
  privateChainAddress: opt("PRIVATE_CHAIN_ADDRESS", ""),
  publicChainAddress: opt("PUBLIC_CHAIN_ADDRESS", ""),

  // API
  apiPort: Number(opt("API_PORT", "3000")),

  // Cron
  cronSchedule: opt("CRON_SCHEDULE", "*/5 * * * *"),
  tokenAddresses: opt("TOKEN_ADDRESSES", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // AI
  aiProvider: opt("AI_PROVIDER", "openrouter") as "anthropic" | "openai" | "gemini" | "openrouter",
  anthropicApiKey: opt("ANTHROPIC_API_KEY", ""),
  openaiApiKey: opt("OPENAI_API_KEY", ""),
  geminiApiKey: opt("GEMINI_API_KEY", ""),
  openrouterApiKey: opt("OPENROUTER_API_KEY", ""),
  openrouterModel: opt("OPENROUTER_MODEL", "auto"),
};
