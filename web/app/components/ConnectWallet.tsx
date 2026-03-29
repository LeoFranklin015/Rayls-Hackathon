"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Fingerprint, Loader2, ChevronDown, Check, Copy } from "lucide-react";
import { formatEther } from "viem";
import { useWallet } from "../lib/wallet-context";
import {
  getSavedPasskeys,
  removePasskey,
} from "../lib/passkey-storage";
import { fetchPasskeyDisplayNames } from "../lib/webauthn";
import { isSubnameAvailable } from "../lib/ens";
import type { SavedPasskey } from "../lib/types";

export default function ConnectWallet() {
  const { address, isConnected, isConnecting, error, passkeyName, ensName, connect, create, disconnect } =
    useWallet();
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [passkeys, setPasskeys] = useState<SavedPasskey[]>([]);
  const [newName, setNewName] = useState("");
  const [view, setView] = useState<"select" | "create">("select");
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usdrBalance, setUsdrBalance] = useState<string | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Debounced availability check
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameAvailable(null);
      setCheckingName(false);
      return;
    }
    setCheckingName(true);
    setNameAvailable(null);
    checkTimer.current = setTimeout(async () => {
      const available = await isSubnameAvailable(trimmed);
      setNameAvailable(available);
      setCheckingName(false);
    }, 500);
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [newName]);

  useEffect(() => {
    if (showModal) {
      const saved = getSavedPasskeys();
      setPasskeys(saved);
      setView(saved.length > 0 ? "select" : "create");

      // Sync display names from backend
      if (saved.length > 0) {
        fetchPasskeyDisplayNames(saved.map((p) => p.id)).then((names) => {
          setPasskeys((prev) =>
            prev.map((p) => ({
              ...p,
              name: names.get(p.id) || p.name,
            }))
          );
        });
      }
    }
  }, [showModal]);

  // Fetch USDR balance via server-side proxy to Rayls RPC
  useEffect(() => {
    if (!address) return;
    const fetchBalance = () => {
      fetch(`/api/balance?address=${address}`)
        .then((r) => r.json())
        .then((json) => {
          const bal = parseFloat(formatEther(BigInt(json.balance)));
          setUsdrBalance(bal >= 1 ? bal.toFixed(2) : bal.toFixed(4));
        })
        .catch((err) => {
          console.error("Failed to fetch USDR balance:", err);
          setUsdrBalance("0.0000");
        });
    };
    fetchBalance();
    if (showDropdown) fetchBalance();
  }, [address, showDropdown]);

  // Close modal on successful connect
  useEffect(() => {
    if (isConnected && showModal) setShowModal(false);
  }, [isConnected, showModal]);

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const handleSelectPasskey = (id: string) => {
    connect(id);
  };

  const handleBrowseAll = () => {
    connect();
  };

  const handleCreate = () => {
    if (newName.trim()) {
      create(newName.trim());
      setNewName("");
    }
  };

  const handleRemove = (id: string) => {
    removePasskey(id);
    setPasskeys((prev) => prev.filter((p) => p.id !== id));
  };

  // Connected state — show address button
  if (isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-card px-3 py-1.5 font-mono text-[12px] text-foreground transition-colors hover:bg-card-warm/50"
        >
          <span className="h-2 w-2 rounded-full bg-success" />
          {ensName || truncated}
          <ChevronDown className="h-3 w-3 text-muted" />
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-card border border-border p-2">
              <div className="px-3 py-2">
                <p className="text-[11px] text-muted">Connected as</p>
                <p className="font-mono text-[12px] text-foreground">
                  {ensName || passkeyName || "Passkey"}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <p className="font-mono text-[10px] text-muted break-all">
                    {address}
                  </p>
                  <button
                    onClick={() => address && handleCopy(address)}
                    className="shrink-0 cursor-pointer p-0.5 text-muted-light transition-colors hover:text-foreground"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
              <div className="border-t border-border mt-1 pt-1 px-3 py-2">
                <p className="text-[11px] text-muted">Balance</p>
                <p className="font-mono text-[14px] font-medium text-foreground">
                  {usdrBalance !== null ? `${usdrBalance} USDR` : "—"}
                </p>
              </div>
              <div className="border-t border-border pt-1">
                <button
                  onClick={() => {
                    disconnect();
                    setShowDropdown(false);
                  }}
                  className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-[12px] text-accent transition-colors hover:bg-card-warm/50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isConnecting}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-card-dark px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {isConnecting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Fingerprint className="h-3 w-3" />
        )}
        {isConnecting ? "Connecting..." : "Connect"}
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-medium text-foreground">
                {view === "select" ? "Select Account" : "Create Passkey"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="cursor-pointer p-1 text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {error && (
                <div className="mb-4 rounded-lg bg-accent/5 px-3 py-2 text-[12px] text-accent">
                  {error}
                </div>
              )}

              {view === "select" ? (
                <>
                  {/* Saved passkeys */}
                  {passkeys.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                        Saved accounts
                      </p>
                      <div className="space-y-1.5">
                        {passkeys.map((pk) => (
                          <div
                            key={pk.id}
                            className="flex items-center gap-2 rounded-xl bg-background p-3"
                          >
                            <button
                              onClick={() => handleSelectPasskey(pk.id)}
                              disabled={isConnecting}
                              className="flex flex-1 cursor-pointer items-center gap-3 text-left disabled:opacity-50"
                            >
                              <Fingerprint className="h-4 w-4 shrink-0 text-muted" />
                              <div className="min-w-0">
                                <p className="text-[13px] text-foreground truncate">
                                  {pk.name}
                                </p>
                                <p className="text-[10px] text-muted">
                                  {pk.lastUsed
                                    ? `Last used ${new Date(pk.lastUsed).toLocaleDateString()}`
                                    : "Never used"}
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={() => handleRemove(pk.id)}
                              className="cursor-pointer p-1 text-muted-light hover:text-accent"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Browse all */}
                  <button
                    onClick={handleBrowseAll}
                    disabled={isConnecting}
                    className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border py-3 text-[13px] text-foreground transition-colors hover:bg-background disabled:opacity-50"
                  >
                    <Fingerprint className="h-4 w-4" />
                    {isConnecting ? "Authenticating..." : "Browse all passkeys"}
                  </button>

                  {/* Switch to create */}
                  <button
                    onClick={() => setView("create")}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 py-2 text-[12px] text-muted transition-colors hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    Create new passkey
                  </button>
                </>
              ) : (
                <>
                  {/* Create new passkey */}
                  <div className="mb-4">
                    <p className="mb-2 font-mono text-[10px] tracking-[0.15em] text-muted uppercase">
                      Passkey name
                    </p>
                    <div className={`flex items-center rounded-xl border bg-background ${nameAvailable === false ? "border-accent/40" : nameAvailable === true ? "border-success/40" : "border-border"}`}>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        placeholder="e.g. alice"
                        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[13px] text-foreground outline-none placeholder:text-muted-light"
                        autoFocus
                      />
                      <span className="shrink-0 pr-1 text-[11px] text-muted">.rayls.eth</span>
                      <span className="shrink-0 w-6 pr-3 flex items-center justify-center">
                        {checkingName && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted" />
                        )}
                        {!checkingName && nameAvailable === true && (
                          <Check className="h-3 w-3 text-success" />
                        )}
                        {!checkingName && nameAvailable === false && (
                          <X className="h-3 w-3 text-accent" />
                        )}
                      </span>
                    </div>
                    {!checkingName && nameAvailable === false && newName.trim().length >= 2 && (
                      <p className="mt-1.5 text-[11px] text-accent">Name already taken</p>
                    )}
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || isConnecting || nameAvailable === false || checkingName}
                    className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-card-dark py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Fingerprint className="h-4 w-4" />
                    )}
                    {isConnecting ? "Creating..." : "Create & Connect"}
                  </button>

                  {passkeys.length > 0 && (
                    <button
                      onClick={() => setView("select")}
                      className="flex w-full cursor-pointer items-center justify-center py-2 text-[12px] text-muted transition-colors hover:text-foreground"
                    >
                      Back to saved accounts
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
