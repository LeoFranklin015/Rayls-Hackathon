export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
}

export interface AnalysisResult {
  approved: boolean;
  score: number;
  reason: string;
}

export interface AttestationData {
  attester: string;
  token: string;
  approved: boolean;
  reason: string;
  score: number;
  timestamp: number;
}

export interface Listing {
  id: number;
  token: string;
  assetType: number;
  tokenId: bigint;
  amount: bigint;
  price: bigint;
  active: boolean;
}

export interface MintRequest {
  type: "erc20" | "erc721" | "erc1155";
  to: string;
  amount?: string;
  tokenId?: string;
  data?: string;
}

export interface AppraisalResult {
  score: number;       // 0-100 (100 = full value)
  reason: string;
}

export interface IndexedEvent {
  eventName: string;
  contractAddress: string;
  blockNumber: number;
  transactionHash: string;
  args: Record<string, unknown>;
  timestamp: number;
}
