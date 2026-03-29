import type { AgentResult, EvaluationResult } from "./agents/types.js";

type Listener = (eventType: string, data: unknown) => void;

const evaluations = new Map<string, EvaluationResult>();
const evaluationsByCollateral = new Map<number, string[]>();
const listeners = new Map<string, Set<Listener>>();

export function createEvaluation(eval_: EvaluationResult): void {
  evaluations.set(eval_.id, eval_);
  const ids = evaluationsByCollateral.get(eval_.collateralId) || [];
  ids.push(eval_.id);
  evaluationsByCollateral.set(eval_.collateralId, ids);
}

export function addAgentResult(evalId: string, result: AgentResult): void {
  const eval_ = evaluations.get(evalId);
  if (!eval_) return;
  eval_.agents.push(result);
  emit(evalId, "agent-result", result);
}

export function completeEvaluation(evalId: string, finalVerdict: boolean, attestationUid?: string): void {
  const eval_ = evaluations.get(evalId);
  if (!eval_) return;
  eval_.finalVerdict = finalVerdict;
  eval_.status = "completed";
  if (attestationUid) eval_.attestationUid = attestationUid;
  emit(evalId, "final-verdict", eval_);
}

export function getEvaluation(evalId: string): EvaluationResult | undefined {
  return evaluations.get(evalId);
}

export function getEvaluationsByCollateral(collateralId: number): EvaluationResult[] {
  const ids = evaluationsByCollateral.get(collateralId) || [];
  return ids.map((id) => evaluations.get(id)).filter(Boolean) as EvaluationResult[];
}

export function getAllEvaluations(): EvaluationResult[] {
  return [...evaluations.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function getPassingEvaluation(collateralId: number): EvaluationResult | undefined {
  const evals = getEvaluationsByCollateral(collateralId);
  return evals.find((e) => e.status === "completed" && e.finalVerdict);
}

// SSE pub/sub
export function addListener(evalId: string, listener: Listener): void {
  if (!listeners.has(evalId)) listeners.set(evalId, new Set());
  listeners.get(evalId)!.add(listener);
}

export function removeListener(evalId: string, listener: Listener): void {
  listeners.get(evalId)?.delete(listener);
}

function emit(evalId: string, eventType: string, data: unknown): void {
  listeners.get(evalId)?.forEach((fn) => fn(eventType, data));
}
