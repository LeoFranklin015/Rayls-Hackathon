"use client";

import { useState, useEffect, useRef } from "react";

interface LogEntry {
  time: string;
  message: string;
  highlights: string[];
  type?: "info" | "success" | "warn" | "system";
}

const initialLogs: LogEntry[] = [
  {
    time: "09:42:11",
    message: "Scanning portfolio for collateral exceeding 90-day default threshold",
    highlights: ["90-day"],
    type: "system",
  },
  {
    time: "09:42:14",
    message: "Flagged SW London residential — 94 days overdue, enforcement active",
    highlights: ["SW London residential"],
    type: "warn",
  },
  {
    time: "09:42:19",
    message: "Fetching market valuation for Zone 2 residential properties",
    highlights: ["Zone 2 residential"],
    type: "info",
  },
  {
    time: "09:42:23",
    message: "Valuation confirmed: £2,000,000 — LTV calculated: 50%",
    highlights: ["£2,000,000", "50%"],
    type: "success",
  },
  {
    time: "09:42:28",
    message: "Checking encumbrances — none found",
    highlights: ["none found"],
    type: "success",
  },
  {
    time: "09:42:31",
    message: "Running inference attack on proposed public fields",
    highlights: ["inference attack"],
    type: "system",
  },
  {
    time: "09:42:33",
    message: "Stripped: exact_address, borrower_id — GDPR risk detected",
    highlights: ["exact_address", "borrower_id"],
    type: "warn",
  },
  {
    time: "09:42:35",
    message: "Attestation ready — submitted to compliance queue for approval",
    highlights: ["compliance queue"],
    type: "info",
  },
];

const cycleLogs: LogEntry[] = [
  {
    time: "09:42:38",
    message: "Waiting for compliance officer approval...",
    highlights: ["compliance officer"],
    type: "success",
  },
  {
    time: "09:42:44",
    message: "Scanning Manchester commercial — 121 days overdue",
    highlights: ["Manchester commercial", "121 days"],
    type: "warn",
  },
  {
    time: "09:42:48",
    message: "Cross-referencing Land Registry for encumbrance check",
    highlights: ["Land Registry"],
    type: "system",
  },
  {
    time: "09:42:52",
    message: "Valuation confirmed: £4,100,000 — LTV: 59%",
    highlights: ["£4,100,000", "59%"],
    type: "success",
  },
  {
    time: "09:42:56",
    message: "Compliance officer approved SW London attestation",
    highlights: ["approved", "SW London"],
    type: "success",
  },
  {
    time: "09:43:01",
    message: "Bridging PreLiquidationToken to Rayls Public L1",
    highlights: ["PreLiquidationToken", "Public L1"],
    type: "info",
  },
  {
    time: "09:43:05",
    message: "Token live — 800 shares at £1,000 on marketplace",
    highlights: ["800 shares", "£1,000"],
    type: "success",
  },
  {
    time: "09:43:09",
    message: "Monitoring Birmingham industrial — 67 days, pending threshold",
    highlights: ["Birmingham industrial", "67 days"],
    type: "system",
  },
  {
    time: "09:43:14",
    message: "Daily inference re-check on all active listings — no leakage",
    highlights: ["no leakage"],
    type: "success",
  },
];

function renderMessage(message: string, highlights: string[]) {
  let html = message;
  highlights.forEach((h) => {
    html = html.replace(h, `<span class="text-white/90">${h}</span>`);
  });
  return html;
}

export default function AgentLog() {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [cycleIndex, setCycleIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCycleIndex((prev) => {
        const idx = prev % cycleLogs.length;
        setLogs((current) => [...current.slice(-30), cycleLogs[idx]]);
        return prev + 1;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-card-dark">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <span className="text-[13px] font-medium text-white">
          Agent activity
        </span>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-[11px] text-white/40">Live</span>
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
                className="font-mono text-[11px] leading-[20px] text-white/50"
                dangerouslySetInnerHTML={{
                  __html: renderMessage(log.message, log.highlights),
                }}
              />
            </div>
          ))}
          <div className="flex items-center gap-3 px-1 py-1.5">
            <span className="font-mono text-[11px] text-white/25">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}
