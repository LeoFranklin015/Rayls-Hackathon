import { defineChain } from "viem";

export const raylsTestnet = defineChain({
  id: 7_295_799,
  name: "Rayls Testnet",
  nativeCurrency: {
    name: "USDR",
    symbol: "USDR",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.rayls.com/"] },
  },
});

export const BUNDLER_URL =
  process.env.NEXT_PUBLIC_BUNDLER_URL ?? "https://testnet-rpc.rayls.com/";
export const RPC_URL = BUNDLER_URL;
export const CHAIN = raylsTestnet;

export const ENTRY_POINT_ADDRESS =
  "0x7c15F90346FeaF7CF68b4199711532CF04976F0b" as const;
export const FACTORY_ADDRESS =
  "0xbE6ADF6b82C9d26820AABf5263E954c696342564" as const;
export const CONTRACT_NAME = "JustanAccount";
export const CONTRACT_VERSION = "1";

export const PAYMASTER_URL =
  process.env.NEXT_PUBLIC_PAYMASTER_URL ?? "http://localhost:3000";

export const API_BASE_URL ="https://api.justaname.id";
export const API_KEY =
  process.env.NEXT_PUBLIC_API_KEY ?? "VJZaS2Pq14R4r1kIdBPV3NprnMeJGJED";
