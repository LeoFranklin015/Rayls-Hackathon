export type AgentRole =
  | "lead-analyst"
  | "compliance-officer"
  | "valuation-auditor"
  | "risk-assessor"
  | "privacy-guardian";

export interface AgentResult {
  agent: AgentRole;
  approved: boolean;
  confidence: number; // 0-100
  reasoning: string;
  flags: string[];    // concerns (empty if approved)
  timestamp: number;
}

export interface CollateralData {
  collateralId: number;
  ownerId: string;       // bytes32 hex
  loanAmount: string;    // wei
  timeDays: number;
  startTimestamp: number;
  interest: number;      // basis points
  yield_: number;        // basis points
  colType: string;       // "Land" | "House" | "Vehicle"
  info: string;
  active: boolean;
  totalValue: string;    // wei (loanAmount + accrued interest)
  daysElapsed: number;   // days since loan start
}

export interface EvaluationResult {
  id: string;
  collateralId: number;
  loanData: CollateralData;
  agents: AgentResult[];
  finalVerdict: boolean;
  status: "running" | "completed";
  createdAt: number;
  attestationUid?: string;
}
