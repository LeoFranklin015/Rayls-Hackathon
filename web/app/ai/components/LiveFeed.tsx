"use client";

import { useEffect, useState } from "react";
import AgentCard from "./AgentCard";
import TokenizeButton from "./TokenizeButton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const AGENT_ORDER = [
  "lead-analyst",
  "compliance-officer",
  "valuation-auditor",
  "risk-assessor",
  "privacy-guardian",
];

interface AgentResult {
  agent: string;
  approved: boolean;
  confidence: number;
  reasoning: string;
  flags: string[];
  timestamp: number;
}

interface EvalId {
  collateralId: number;
  evalId: string;
}

interface EvaluationState {
  agents: Map<string, AgentResult>;
  finalVerdict: boolean | null;
  loanData: any;
  attestationUid: string | null;
}

export default function LiveFeed({
  evaluations,
  onComplete,
}: {
  evaluations: EvalId[];
  onComplete: () => void;
}) {
  const [states, setStates] = useState<Map<string, EvaluationState>>(new Map());
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const sources: EventSource[] = [];

    for (const { evalId, collateralId } of evaluations) {
      const es = new EventSource(`${API_BASE}/ai/evaluate/${evalId}/stream`);

      es.addEventListener("agent-result", (e) => {
        const result: AgentResult = JSON.parse(e.data);
        setStates((prev) => {
          const next = new Map(prev);
          const state = next.get(evalId) || {
            agents: new Map(),
            finalVerdict: null,
            loanData: null,
            attestationUid: null,
          };
          state.agents.set(result.agent, result);
          next.set(evalId, { ...state, agents: new Map(state.agents) });
          return next;
        });
      });

      es.addEventListener("final-verdict", (e) => {
        const data = JSON.parse(e.data);
        setStates((prev) => {
          const next = new Map(prev);
          const state = next.get(evalId) || {
            agents: new Map(),
            finalVerdict: null,
            loanData: null,
            attestationUid: null,
          };
          state.finalVerdict = data.finalVerdict;
          state.loanData = data.loanData;
          state.attestationUid = data.attestationUid || null;
          next.set(evalId, { ...state });
          return next;
        });
        setCompletedCount((c) => c + 1);
        es.close();
      });

      es.onerror = () => {
        es.close();
      };

      sources.push(es);
    }

    return () => {
      sources.forEach((es) => es.close());
    };
  }, [evaluations]);

  useEffect(() => {
    if (completedCount > 0 && completedCount === evaluations.length) {
      onComplete();
    }
  }, [completedCount, evaluations.length, onComplete]);

  return (
    <div className="space-y-6">
      {evaluations.map(({ evalId, collateralId }) => {
        const state = states.get(evalId);
        const verdict = state?.finalVerdict;
        const loanData = state?.loanData;

        return (
          <div
            key={evalId}
            className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Collateral #{collateralId}
              </h3>
              {verdict !== null && verdict !== undefined && (
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    verdict
                      ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                  }`}
                >
                  {verdict ? "APPROVED" : "REJECTED"}
                </span>
              )}
              {verdict === null && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 animate-pulse">
                  Evaluating...
                </span>
              )}
            </div>

            {/* Loan details summary */}
            {loanData && (
              <div className="mb-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Type</span>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{loanData.colType}</p>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Interest</span>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{loanData.interest / 100}%</p>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Yield</span>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{loanData.yield_ / 100}%</p>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Days Elapsed</span>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{loanData.daysElapsed}</p>
                </div>
              </div>
            )}

            {/* Agent cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AGENT_ORDER.map((agent) => (
                <AgentCard
                  key={agent}
                  agent={agent}
                  result={state?.agents.get(agent) || null}
                />
              ))}
            </div>

            {/* Average confidence */}
            {verdict !== null && state && state.agents.size > 0 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Average Confidence:{" "}
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {Math.round(
                      [...state.agents.values()].reduce((s, a) => s + a.confidence, 0) /
                        state.agents.size
                    )}
                    %
                  </span>
                </p>
              </div>
            )}

            {/* Attestation UID */}
            {state?.attestationUid && (
              <div className="mt-2 text-center">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  On-chain attestation:{" "}
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {state.attestationUid.slice(0, 10)}...{state.attestationUid.slice(-8)}
                  </span>
                </p>
              </div>
            )}

            {/* Tokenize button — only if all approved */}
            {verdict === true && (
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 text-center">
                <TokenizeButton collateralId={collateralId} />
              </div>
            )}

            {/* Rejection summary */}
            {verdict === false && state && (
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                  Blocking Concerns:
                </p>
                <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
                  {[...state.agents.values()]
                    .filter((a) => !a.approved)
                    .flatMap((a) =>
                      a.flags.length > 0
                        ? a.flags.map((f) => `${AGENT_ORDER.indexOf(a.agent) + 1}. ${a.agent}: ${f}`)
                        : [`${a.agent}: ${a.reasoning.slice(0, 100)}`]
                    )
                    .map((concern, i) => (
                      <li key={i}>{concern}</li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
