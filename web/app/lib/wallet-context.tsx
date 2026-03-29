"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { SmartAccount } from "viem/account-abstraction";
import type { Address } from "viem";
import type { PasskeyCredential } from "./types";
import {
  createPasskey,
  loginWithPasskey,
  loginWithSpecificPasskey,
} from "./webauthn";
import { createSmartAccount, restoreSmartAccount } from "./smart-account";
import { savePasskey } from "./passkey-storage";
import { addRaylsSubname, getRaylsSubname } from "./ens";

const SESSION_KEY = "colliquid_session";

interface PersistedSession {
  address: Address;
  passkeyName: string;
  passkeyId: string;
  publicKey: `0x${string}`;
  ensName: string | null;
}

function loadSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

function persistSession(session: PersistedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // silent
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // silent
  }
}

interface WalletState {
  account: SmartAccount | null;
  address: Address | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  passkeyName: string | null;
  ensName: string | null;
  connect: (credentialId?: string) => Promise<void>;
  create: (name: string) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<SmartAccount | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeyName, setPasskeyName] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);

  // Restore session and SmartAccount from localStorage on mount
  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    setAddress(session.address);
    setPasskeyName(session.passkeyName);
    setEnsName(session.ensName);

    // Auto-restore SmartAccount purely from localStorage (no RPC/API calls)
    if (session.publicKey) {
      restoreSmartAccount(session.passkeyId, session.publicKey, session.address)
        .then((smartAccount) => {
          setAccount(smartAccount);
        })
        .catch(() => {
          // Restore failed — user can manually reconnect
        });
    }
  }, []);

  const finalize = useCallback(
    async (credential: PasskeyCredential) => {
      const smartAccount = await createSmartAccount(credential);
      const addr = await smartAccount.getAddress();
      setAccount(smartAccount);
      setAddress(addr);
      setPasskeyName(credential.name);
      savePasskey({ id: credential.id, name: credential.name });

      // Resolve existing ENS subname
      const existing = await getRaylsSubname(addr);
      setEnsName(existing);

      persistSession({
        address: addr,
        passkeyName: credential.name,
        passkeyId: credential.id,
        publicKey: credential.credential.publicKey,
        ensName: existing,
      });
    },
    []
  );

  const connect = useCallback(
    async (credentialId?: string) => {
      setIsConnecting(true);
      setError(null);
      try {
        const credential = credentialId
          ? await loginWithSpecificPasskey(credentialId)
          : await loginWithPasskey();
        await finalize(credential);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Connection failed");
      } finally {
        setIsConnecting(false);
      }
    },
    [finalize]
  );

  const create = useCallback(
    async (name: string) => {
      setIsConnecting(true);
      setError(null);
      try {
        const credential = await createPasskey(name);
        const smartAccount = await createSmartAccount(credential);
        const addr = await smartAccount.getAddress();
        setAccount(smartAccount);
        setAddress(addr);
        setPasskeyName(credential.name);
        savePasskey({ id: credential.id, name: credential.name });

        // Mint ENS subname on wallet creation
        const result = await addRaylsSubname(name, addr);
        const resolvedName = result.success ? result.subname! : null;
        setEnsName(resolvedName);

        persistSession({
          address: addr,
          passkeyName: credential.name,
          passkeyId: credential.id,
          publicKey: credential.credential.publicKey,
          ensName: resolvedName,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Creation failed");
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    setAccount(null);
    setAddress(null);
    setPasskeyName(null);
    setEnsName(null);
    setError(null);
    clearSession();
  }, []);

  return (
    <WalletContext.Provider
      value={{
        account,
        address,
        isConnected: !!account || !!address,
        isConnecting,
        error,
        passkeyName,
        ensName,
        connect,
        create,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
