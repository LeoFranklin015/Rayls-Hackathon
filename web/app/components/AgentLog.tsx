"use client";

import { useState, useEffect, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface AgentResult {
  agent: string;
  approved: boolean;
  confidence: number;
  reasoning: string;
  flags: string[];
  timestamp: number;
}

interface LogEntry {
  time: string;
  message: string;
  highlights: string[];
  type: "info" | "success" | "warn" | "system" | "error";
}

interface EvalStream {
  evalId: string;
  collateralId: number;
}

const AGENT_NAMES: Record<string, string> = {
  "lead-analyst": "Lead Analyst",
  "compliance-officer": "Compliance Officer",
  "valuation-auditor": "Valuation Auditor",
  "risk-assessor": "Risk Assessor",
  "privacy-guardian": "Privacy Guardian",
};

function ts(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

// Idle cycle logs shown when no evaluation is running
const idleLogs: LogEntry[] = [
  { time: ts(), message: "Agent swarm idle — waiting for analysis request", highlights: ["idle"], type: "system" },
];

export default function AgentLog() {
  const [logs, setLogs] = useState<LogEntry[]>(idleLogs);
  const [activeStream, setActiveStream] = useState<EvalStream | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function addLog(entry: Omit<LogEntry, "time">) {
    setLogs((prev) => [...prev.slice(-50), { ...entry, time: ts() }]);
  }

  // Expose startAnalysis globally so dashboard can call it
  useEffect(() => {
    (window as any).__agentLogStartAnalysis = startAnalysis;
    return () => { delete (window as any).__agentLogStartAnalysis; };
  });

  async function startAnalysis(collateralId: number) {
    // Reset state
    setVerdict(null);
    setLogs([]);
    addLog({ message: `Starting AI evaluation for collateral #${collateralId}`, highlights: [`#${collateralId}`], type: "system" });

    try {
      const res = await fetch(`${API_BASE}/ai/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collateralIds: [collateralId] }),
      });

      if (!res.ok) {
        const err = await res.json();
        addLog({ message: `Error: ${err.error}`, highlights: [], type: "error" });
        return;
      }

      const data = await res.json();
      const { evalId } = data.evaluationIds[0];
      setActiveStream({ evalId, collateralId });

      addLog({ message: "Evaluation dispatched — connecting to agent stream...", highlights: ["agent stream"], type: "info" });

      // Connect SSE
      const es = new EventSource(`${API_BASE}/ai/evaluate/${evalId}/stream`);

      es.addEventListener("agent-result", (e) => {
        const result: AgentResult = JSON.parse(e.data);
        const name = AGENT_NAMES[result.agent] || result.agent;
        const status = result.approved ? "APPROVED" : "REJECTED";
        const statusType = result.approved ? "success" : "warn";

        addLog({
          message: `${name}: ${status} (${result.confidence}% confidence)`,
          highlights: [name, status],
          type: statusType as "success" | "warn",
        });

        if (result.reasoning) {
          const short = result.reasoning.length > 120
            ? result.reasoning.slice(0, 120) + "..."
            : result.reasoning;
          addLog({
            message: `  → ${short}`,
            highlights: [],
            type: "info",
          });
        }

        if (result.flags.length > 0) {
          addLog({
            message: `  ⚑ Flags: ${result.flags.join(", ")}`,
            highlights: result.flags,
            type: "warn",
          });
        }
      });

      es.addEventListener("final-verdict", (e) => {
        const data = JSON.parse(e.data);
        const approved = data.finalVerdict;
        setVerdict(approved);

        addLog({
          message: approved
            ? `VERDICT: All agents approved — collateral #${collateralId} eligible for tokenization`
            : `VERDICT: Evaluation failed — collateral #${collateralId} blocked`,
          highlights: approved ? ["approved", "eligible"] : ["failed", "blocked"],
          type: approved ? "success" : "error",
        });

        // Don't close — pipeline continues with attestation, tokenize, bridge, list
        if (!approved) {
          setActiveStream(null);
          addLog({ message: "Agent swarm idle — waiting for next request", highlights: ["idle"], type: "system" });
          es.close();
        }
      });

      es.addEventListener("status", (e) => {
        const data = JSON.parse(e.data);
        const typeMap: Record<string, "info" | "success" | "warn" | "error" | "system"> = {
          info: "info",
          success: "success",
          warn: "warn",
          error: "error",
        };
        addLog({
          message: data.message,
          highlights: [],
          type: typeMap[data.type] || "info",
        });

        // Close stream when pipeline finishes
        if (data.message === "Pipeline complete" || data.type === "error") {
          setActiveStream(null);
          addLog({ message: "Agent swarm idle — waiting for next request", highlights: ["idle"], type: "system" });
          es.close();
        }
      });

      es.onerror = () => {
        addLog({ message: "Stream connection lost", highlights: [], type: "error" });
        setActiveStream(null);
        es.close();
      };
    } catch (err: any) {
      addLog({ message: `Failed to start evaluation: ${err.message}`, highlights: [], type: "error" });
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const typeColors: Record<string, string> = {
    info: "text-white/50",
    success: "text-emerald-400/80",
    warn: "text-amber-400/80",
    error: "text-red-400/80",
    system: "text-white/35",
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-card-dark">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <span className="text-[13px] font-medium text-white">
          Agent activity
        </span>
        <div className="flex items-center gap-2">
          {activeStream ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              <span className="text-[11px] text-white/40">Evaluating #{activeStream.collateralId}</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-muted" />
              <span className="text-[11px] text-white/40">Idle</span>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div ref={scrollRef} className="agent-log flex-1 overflow-y-auto px-5 py-3">
        <div className="flex flex-col gap-1">
          {logs.map((log, i) => (
            <div
              key={`${log.time}-${i}`}
              className="flex items-start gap-3 rounded px-1 py-1.5"
            >
              <span className="shrink-0 font-mono text-[11px] leading-[20px] text-white/25">
                {log.time}
              </span>
              <span
                className={`font-mono text-[11px] leading-[20px] ${typeColors[log.type] || "text-white/50"}`}
                dangerouslySetInnerHTML={{
                  __html: renderMessage(log.message, log.highlights),
                }}
              />
            </div>
          ))}
          <div className="flex items-center gap-3 px-1 py-1.5">
            <span className={`font-mono text-[11px] ${activeStream ? "animate-pulse text-accent" : "text-white/25"}`}>
              {activeStream ? "▸" : "_"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const PUBLIC_EXPLORER = "https://testnet-explorer.rayls.com/tx/";
const PRIVACY_EXPLORER = "https://blockscout-privacy-node-5.rayls.com/tx/";

function renderMessage(message: string, highlights: string[]) {
  let html = message;

  // Detect full tx/attestation hashes (0x + 64 hex chars)
  html = html.replace(/(0x[a-fA-F0-9]{64})/g, (hash) => {
    const isPrivacy = message.includes("privacy node") || message.includes("Bridge TX");
    const explorer = isPrivacy ? PRIVACY_EXPLORER : PUBLIC_EXPLORER;
    const short = hash.slice(0, 10) + "..." + hash.slice(-6);
    return `<a href="${explorer}${hash}" target="_blank" rel="noopener" class="underline decoration-dotted underline-offset-2 text-white/80 hover:text-white">${short}</a>`;
  });

  highlights.forEach((h) => {
    html = html.replace(h, `<span class="text-white/90">${h}</span>`);
  });
  return html;
}
