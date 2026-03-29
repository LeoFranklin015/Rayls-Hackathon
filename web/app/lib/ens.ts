import { JustaName, type ChainId } from "@justaname.id/sdk";
import { sepolia } from "viem/chains";

const RAYLS_ENS_DOMAIN = "rayls.eth";
const CHAIN_ID = sepolia.id as ChainId;
const ENS_API_KEY =
  process.env.NEXT_PUBLIC_JAN_API_KEY ?? "u";

const initJustaName = () =>
  JustaName.init({
    networks: [
      {
        chainId: CHAIN_ID,
        providerUrl: "https://sepolia.drpc.org",
      },
    ],
    ensDomains: [
      {
        ensDomain: RAYLS_ENS_DOMAIN,
        chainId: CHAIN_ID,
      },
    ],
  });

export async function addRaylsSubname(
  username: string,
  address: string
): Promise<{ success: boolean; subname?: string; error?: string }> {
  try {
    const justaName = initJustaName();
    await justaName.subnames.addSubname({
      username: username.toLowerCase().replace(/\s+/g, "-"),
      ensDomain: RAYLS_ENS_DOMAIN,
      chainId: CHAIN_ID,
      addresses: {
        "60": address,
      },
      apiKey: ENS_API_KEY,
      overrideSignatureCheck:true
    });
    const subname = `${username.toLowerCase().replace(/\s+/g, "-")}.${RAYLS_ENS_DOMAIN}`;
    return { success: true, subname };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to add subname";
    console.error("Error adding subname:", error);
    return { success: false, error: message };
  }
}

export async function getRaylsSubname(
  address: string
): Promise<string | null> {
  try {
    const justaName = initJustaName();
    const response = await justaName.subnames.getSubnamesByAddress({
      address,
      chainId: CHAIN_ID,
    });
    const raylsSubname = response?.subnames?.find((s) =>
      s.ens.endsWith(`.${RAYLS_ENS_DOMAIN}`)
    );
    return raylsSubname?.ens || null;
  } catch (error) {
    console.error("Error resolving subname:", error);
    return null;
  }
}

export async function isSubnameAvailable(
  username: string
): Promise<boolean> {
  try {
    const justaName = initJustaName();
    const response = await justaName.subnames.isSubnameAvailable({
      subname: `${username.toLowerCase().replace(/\s+/g, "-")}.${RAYLS_ENS_DOMAIN}`,
      chainId: CHAIN_ID,
    });
    return response?.isAvailable || false;
  } catch {
    return false;
  }
}
