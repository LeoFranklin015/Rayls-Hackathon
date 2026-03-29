import { type SmartAccount, toWebAuthnAccount } from "viem/account-abstraction";
import { type Address } from "viem";
import type { PasskeyCredential } from "./types";
import { getPublicClient } from "./clients";
import { abi, toJustanAccount } from "./toJustanAccount";

async function findOwnerIndex(
  smartAccountAddress: Address,
  passkeyPublicKey: `0x${string}`
): Promise<number> {
  const publicClient = getPublicClient();

  try {
    const code = await publicClient.getCode({ address: smartAccountAddress });
    if (!code || code === "0x") return 0;

    const ownerCount = (await publicClient.readContract({
      address: smartAccountAddress,
      abi,
      functionName: "ownerCount",
    })) as bigint;

    for (let i = 0; i < Number(ownerCount); i++) {
      try {
        const ownerBytes = (await publicClient.readContract({
          address: smartAccountAddress,
          abi,
          functionName: "ownerAtIndex",
          args: [BigInt(i)],
        })) as `0x${string}`;

        if (ownerBytes.toLowerCase() === passkeyPublicKey.toLowerCase()) {
          return i;
        }
      } catch {
        continue;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function restoreSmartAccount(
  passkeyId: string,
  publicKey: `0x${string}`,
  address: Address,
  ownerIndex: number = 0
): Promise<SmartAccount> {
  const webauthnAccount = toWebAuthnAccount({
    credential: { id: passkeyId, publicKey },
  });
  const publicClient = getPublicClient();
  return toJustanAccount({
    client: publicClient,
    owners: [webauthnAccount],
    ownerIndex,
    address,
  });
}

export async function createSmartAccount(
  passkeyCredential: PasskeyCredential
): Promise<SmartAccount> {
  const webauthnAccount = toWebAuthnAccount({
    credential: passkeyCredential.credential,
  });

  const publicClient = getPublicClient();

  const tempSmartAccount = await toJustanAccount({
    client: publicClient,
    owners: [webauthnAccount],
  });

  const smartAccountAddress = await tempSmartAccount.getAddress();
  const ownerIndex = await findOwnerIndex(
    smartAccountAddress,
    webauthnAccount.publicKey
  );

  return await toJustanAccount({
    client: publicClient,
    owners: [webauthnAccount],
    ownerIndex,
  });
}
