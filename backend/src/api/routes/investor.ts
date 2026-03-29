import { Router } from "express";
import { ethers } from "ethers";
import { marketplaceRead, collateralTokenRead, redemptionVaultRead } from "../../shared/contracts.js";

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

              base.collateral = {
                bankName,
                collateralId: tc.collateralId.toString(),
                maxTokenCount: tc.maxTokenCount.toString(),
                totalValue: ethers.formatEther(tc.totalValue),
                yieldBasisPoints: Number(tc.yieldBasisPoints),
                filled,
                fractionsSold: fractionsSold.toString(),
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
