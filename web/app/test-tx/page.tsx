"use client";

import { useState } from "react";
import { useWallet } from "../lib/wallet-context";
import { sendETH } from "../lib/transactions";
import { getPublicClient } from "../lib/clients";
import { formatEther, type Address } from "viem";
import { Loader2 } from "lucide-react";

export default function TestTx() {
  const { account, address, isConnected, isConnecting } = useWallet();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [balance, setBalance] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    if (!address) return;
    const client = getPublicClient();
    const bal = await client.getBalance({ address });
    setBalance(formatEther(bal));
  };

  const handleSend = async () => {
    if (!account || !to) return;
    setLoading(true);
    setStatus("Preparing UserOperation...");
    setTxHash(null);
    try {
      setStatus("Sign with your passkey (biometric prompt)...");
      const hash = await sendETH(account, to as Address, amount);
      setTxHash(hash);
      setStatus("Transaction confirmed!");
      fetchBalance();
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[600px] px-8 pt-16 pb-16">
      <p className="mb-1 font-mono text-[12px] tracking-[0.2em] text-muted uppercase">
        Test
      </p>
      <h1 className="font-serif text-[36px] font-light tracking-tight text-foreground">
        Send Transaction
      </h1>

      {!isConnected ? (
        <div className="mt-8 rounded-2xl bg-card p-8 text-center">
          <p className="text-[14px] text-muted">
            Connect your wallet from the navbar first.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {/* Account info */}
          <div className="rounded-2xl bg-card p-6">
            <p className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
              Your smart account
            </p>
            <p className="mt-1 font-mono text-[13px] text-foreground break-all">
              {address}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={fetchBalance}
                className="cursor-pointer text-[12px] text-accent hover:text-accent-hover"
              >
                Check balance
              </button>
              {balance !== null && (
                <span className="font-mono text-[13px] text-foreground">
                  {balance} USDR
                </span>
              )}
            </div>
          </div>

          {/* Send form */}
          <div className="rounded-2xl bg-card p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                  Recipient address
                </label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-light"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                  Amount (USDR)
                </label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-[13px] text-foreground outline-none"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !to || !account || isConnecting}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-card-dark py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Sending..." : "Send ETH"}
              </button>
            </div>
          </div>

          {/* Status */}
          {status && (
            <div className="rounded-2xl bg-card p-6">
              <p className="font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                Status
              </p>
              <p className="mt-1 text-[13px] text-foreground">{status}</p>
              {txHash && (
                <p className="mt-2 font-mono text-[11px] text-accent break-all">
                  tx: {txHash}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
