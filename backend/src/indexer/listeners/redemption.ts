import { ethers } from "ethers";
import { publicChainProvider } from "../../shared/providers.js";
import { REDEMPTION_VAULT_ABI } from "../../shared/abis.js";
import { config } from "../../shared/config.js";
import { addEvent } from "../store.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("indexer-redemption");

export function listenRedemptionEvents() {
  if (!config.redemptionVaultAddress) {
    log.warn("REDEMPTION_VAULT_ADDRESS not configured, skipping redemption listener");
    return;
  }

  const vault = new ethers.Contract(config.redemptionVaultAddress, REDEMPTION_VAULT_ABI, publicChainProvider);

  vault.on("PurchaseRegistered", (collateralId: bigint, buyer: string, amount: bigint, event: any) => {
    addEvent({
      eventName: "PurchaseRegistered",
      contractAddress: config.redemptionVaultAddress,
      blockNumber: event.log.blockNumber,
      transactionHash: event.log.transactionHash,
      args: { collateralId: collateralId.toString(), buyer, amount: amount.toString() },
      timestamp: Date.now(),
    });
    log.info(`Purchase registered: collateral #${collateralId}, buyer=${buyer}, amount=${amount}`);
  });

  vault.on("CollateralFilled", (collateralId: bigint, totalPaid: bigint, holderCount: bigint, event: any) => {
    addEvent({
      eventName: "CollateralFilled",
      contractAddress: config.redemptionVaultAddress,
      blockNumber: event.log.blockNumber,
      transactionHash: event.log.transactionHash,
      args: {
        collateralId: collateralId.toString(),
        totalPaid: ethers.formatEther(totalPaid),
        holderCount: holderCount.toString(),
      },
      timestamp: Date.now(),
    });
    log.info(`Collateral #${collateralId} filled: paid ${ethers.formatEther(totalPaid)} USDR to ${holderCount} holders`);
  });

  vault.on("YieldPaid", (collateralId: bigint, holder: string, amount: bigint, payout: bigint, event: any) => {
    addEvent({
      eventName: "YieldPaid",
      contractAddress: config.redemptionVaultAddress,
      blockNumber: event.log.blockNumber,
      transactionHash: event.log.transactionHash,
      args: {
        collateralId: collateralId.toString(),
        holder,
        amount: amount.toString(),
        payout: ethers.formatEther(payout),
      },
      timestamp: Date.now(),
    });
    log.info(`Yield paid: collateral #${collateralId}, holder=${holder}, ${amount} fractions → ${ethers.formatEther(payout)} USDR`);
  });

  log.info(`Listening for redemption vault events on ${config.redemptionVaultAddress}`);
}
