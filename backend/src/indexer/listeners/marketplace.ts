import { ethers } from "ethers";
import { publicChainProvider } from "../../shared/providers.js";
import { MARKETPLACE_ABI } from "../../shared/abis.js";
import { config } from "../../shared/config.js";
import { addEvent } from "../store.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("indexer-marketplace");

export function listenMarketplaceEvents() {
  if (!config.marketplaceAddress) {
    log.warn("MARKETPLACE_ADDRESS not configured, skipping marketplace listener");
    return;
  }

  const marketplace = new ethers.Contract(config.marketplaceAddress, MARKETPLACE_ABI, publicChainProvider);

  marketplace.on("Listed", (listingId: bigint, token: string, assetType: number, price: bigint, event: any) => {
    addEvent({
      eventName: "Listed",
      contractAddress: config.marketplaceAddress,
      blockNumber: event.log.blockNumber,
      transactionHash: event.log.transactionHash,
      args: { listingId: listingId.toString(), token, assetType, price: ethers.formatEther(price) },
      timestamp: Date.now(),
    });
    log.info(`New listing #${listingId}: token=${token} price=${ethers.formatEther(price)} USDR`);
  });

  marketplace.on("Bought", (listingId: bigint, buyer: string, price: bigint, event: any) => {
    addEvent({
      eventName: "Bought",
      contractAddress: config.marketplaceAddress,
      blockNumber: event.log.blockNumber,
      transactionHash: event.log.transactionHash,
      args: { listingId: listingId.toString(), buyer, price: ethers.formatEther(price) },
      timestamp: Date.now(),
    });
    log.info(`Listing #${listingId} bought by ${buyer} for ${ethers.formatEther(price)} USDR`);
  });

  marketplace.on("BoughtFraction", (listingId: bigint, buyer: string, amount: bigint, totalPrice: bigint, event: any) => {
    addEvent({
      eventName: "BoughtFraction",
      contractAddress: config.marketplaceAddress,
      blockNumber: event.log.blockNumber,
      transactionHash: event.log.transactionHash,
      args: {
        listingId: listingId.toString(),
        buyer,
        amount: amount.toString(),
        totalPrice: ethers.formatEther(totalPrice),
      },
      timestamp: Date.now(),
    });
    log.info(`Listing #${listingId}: ${buyer} bought ${amount} fractions for ${ethers.formatEther(totalPrice)} USDR`);
  });

  marketplace.on("Delisted", (listingId: bigint, event: any) => {
    addEvent({
      eventName: "Delisted",
      contractAddress: config.marketplaceAddress,
      blockNumber: event.log.blockNumber,
      transactionHash: event.log.transactionHash,
      args: { listingId: listingId.toString() },
      timestamp: Date.now(),
    });
    log.info(`Listing #${listingId} delisted`);
  });

  log.info(`Listening for marketplace events on ${config.marketplaceAddress}`);
}
