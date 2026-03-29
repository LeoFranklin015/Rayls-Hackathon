import { Router } from "express";
import { ethers } from "ethers";
import { marketplaceRead, collateralTokenRead, collateralRegistryRead, redemptionVaultRead } from "../../shared/contracts.js";

const COL_TYPES = ["Land", "House", "Vehicle"] as const;

const router = Router();

// ── GET /investor/listings — Enriched marketplace listings ──────────────

router.get("/listings", async (_req, res) => {
  try {
    if (!marketplaceRead) return res.status(400).json({ error: "MARKETPLACE_ADDRESS not configured" });

    const activeIds: bigint[] = await marketplaceRead.getActiveListings();

    const listings = await Promise.all(
      activeIds.map(async (id) => {
        const l = await marketplaceRead!.getListing(id);

        const base: Record<string, unknown> = {
          listingId: Number(id),
          token: l.token,
          assetType: Number(l.assetType),
          tokenId: l.tokenId.toString(),
          amount: l.amount.toString(),
          price: ethers.formatEther(l.price),
          priceWei: l.price.toString(),
          active: l.active,
        };

        // Enrich ERC1155 listings with collateral info
        if (Number(l.assetType) === 2 && collateralTokenRead) {
          try {
            const tc = await collateralTokenRead.getTokenizedCollateral(l.tokenId);
            if (tc.tokenized) {
              const bankName = await collateralTokenRead.bankName();
              const filled = redemptionVaultRead ? await redemptionVaultRead.isFilled(l.tokenId) : false;
              const fractionsSold = redemptionVaultRead ? await redemptionVaultRead.fractionsSold(l.tokenId) : 0n;

              // Public-safe data from privacy node
              let ltv = 0;
              let daysElapsed = 0;
              let timeDays = 0;
              if (collateralRegistryRead) {
                try {
                  const collateralId = tc.collateralId;
                  const c = await collateralRegistryRead.getCollateral(collateralId);
                  if (c.active || c.loanAmount > 0n) {
                    const loanAmount = c.loanAmount;
                    const totalVal = tc.totalValue;
                    ltv = totalVal > 0n ? Math.round(Number((loanAmount * 10000n) / totalVal)) / 100 : 0;
                    timeDays = Number(c.timeDays);
                    const now = Math.floor(Date.now() / 1000);
                    daysElapsed = Math.floor((now - Number(c.startTimestamp)) / 86400);
                  }
                } catch (e: any) {
                  console.warn(`Failed to fetch registry data for collateral ${tc.collateralId}: ${e.message}`);
                }
              }

              base.collateral = {
                bankName,
                collateralId: tc.collateralId.toString(),
                maxTokenCount: tc.maxTokenCount.toString(),
                totalValue: ethers.formatEther(tc.totalValue),
                yieldBasisPoints: Number(tc.yieldBasisPoints),
                filled,
                fractionsSold: fractionsSold.toString(),
                ltv,
                daysElapsed,
                timeDays,
              };
            }
          } catch {
            // Not a collateral token listing — skip enrichment
          }
        }

        return base;
      }),
    );

    res.json(listings);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
