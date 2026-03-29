import { createLogger } from "../shared/logger.js";
import { listenTransfers } from "./listeners/transfers.js";
import { listenBridgeEvents } from "./listeners/bridge.js";
import { listenMarketplaceEvents } from "./listeners/marketplace.js";
import { listenRedemptionEvents } from "./listeners/redemption.js";

const log = createLogger("indexer");

export function startIndexer() {
  log.info("Starting event indexer...");
  listenTransfers();
  listenBridgeEvents();
  listenMarketplaceEvents();
  listenRedemptionEvents();
  log.info("All event listeners active");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startIndexer();
  // Keep process alive
  process.on("SIGINT", () => process.exit(0));
}
