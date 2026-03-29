import { ethers } from "ethers";
import { config } from "./config.js";
import { privacyNodeProvider, publicChainProvider, privacyWallet, publicWallet } from "./providers.js";
import { COLLATERAL_REGISTRY_ABI, ERC20_ABI, ERC721_ABI, ERC1155_ABI, ATTESTATION_ABI, MARKETPLACE_ABI, COLLATERAL_TOKEN_ABI, REDEMPTION_VAULT_ABI } from "./abis.js";

function contract(address: string, abi: string[], signerOrProvider: ethers.Signer | ethers.Provider) {
  if (!address) return null;
  return new ethers.Contract(address, abi, signerOrProvider);
}

// Collateral Registry (privacy chain)
export const collateralRegistryRead = contract(config.collateralRegistryAddress, COLLATERAL_REGISTRY_ABI, privacyNodeProvider);
export const collateralRegistryWrite = contract(config.collateralRegistryAddress, COLLATERAL_REGISTRY_ABI, privacyWallet);

// Privacy Node contracts (read via provider, write via wallet)
export const tokenRead = contract(config.tokenAddress, ERC20_ABI, privacyNodeProvider);
export const tokenWrite = contract(config.tokenAddress, ERC20_ABI, privacyWallet);

export const nftRead = contract(config.nftAddress, ERC721_ABI, privacyNodeProvider);
export const nftWrite = contract(config.nftAddress, ERC721_ABI, privacyWallet);

export const multiTokenRead = contract(config.multiTokenAddress, ERC1155_ABI, privacyNodeProvider);
export const multiTokenWrite = contract(config.multiTokenAddress, ERC1155_ABI, privacyWallet);

// Public chain contracts
export const attestationRead = contract(config.attestationAddress, ATTESTATION_ABI, publicChainProvider);
export const attestationWrite = contract(config.attestationAddress, ATTESTATION_ABI, publicWallet);

export const marketplaceRead = contract(config.marketplaceAddress, MARKETPLACE_ABI, publicChainProvider);
export const marketplaceWrite = contract(config.marketplaceAddress, MARKETPLACE_ABI, publicWallet);

// Collateral Token (privacy chain)
export const collateralTokenRead = contract(config.collateralTokenAddress, COLLATERAL_TOKEN_ABI, privacyNodeProvider);
export const collateralTokenWrite = contract(config.collateralTokenAddress, COLLATERAL_TOKEN_ABI, privacyWallet);

// Redemption Vault (public chain)
export const redemptionVaultRead = contract(config.redemptionVaultAddress, REDEMPTION_VAULT_ABI, publicChainProvider);
export const redemptionVaultWrite = contract(config.redemptionVaultAddress, REDEMPTION_VAULT_ABI, publicWallet);

// Dynamic contract creation for arbitrary addresses
export function erc20At(address: string, provider: ethers.Provider) {
  return new ethers.Contract(address, ERC20_ABI, provider);
}

export function erc721At(address: string, provider: ethers.Provider) {
  return new ethers.Contract(address, ERC721_ABI, provider);
}

export function erc1155At(address: string, provider: ethers.Provider) {
  return new ethers.Contract(address, ERC1155_ABI, provider);
}
