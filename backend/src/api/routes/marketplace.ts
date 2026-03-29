import { Router } from "express";
import { ethers } from "ethers";
import { marketplaceRead, marketplaceWrite } from "../../shared/contracts.js";

const router = Router();

router.get("/listings", async (_req, res) => {
  try {
    if (!marketplaceRead) return res.status(400).json({ error: "MARKETPLACE_ADDRESS not configured" });
    const activeIds: bigint[] = await marketplaceRead.getActiveListings();
    const listings = await Promise.all(
      activeIds.map(async (id) => {
        const l = await marketplaceRead!.getListing(id);
        return {
          id: Number(id),
          token: l.token,
          assetType: Number(l.assetType),
          tokenId: l.tokenId.toString(),
          amount: l.amount.toString(),
          price: ethers.formatEther(l.price),
          priceWei: l.price.toString(),
          active: l.active,
        };
      }),
    );
    res.json(listings);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/listings/:id", async (req, res) => {
  try {
    if (!marketplaceRead) return res.status(400).json({ error: "MARKETPLACE_ADDRESS not configured" });
    const l = await marketplaceRead.getListing(req.params.id);
    res.json({
      id: Number(req.params.id),
      token: l.token,
      assetType: Number(l.assetType),
      tokenId: l.tokenId.toString(),
      amount: l.amount.toString(),
      price: ethers.formatEther(l.price),
      priceWei: l.price.toString(),
      active: l.active,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /marketplace/buy — buy fractions via backend wallet
router.post("/buy", async (req, res) => {
  try {
    if (!marketplaceWrite) return res.status(400).json({ error: "MARKETPLACE_ADDRESS not configured" });

    const { listingId, amount } = req.body;
    if (listingId === undefined || !amount) {
      return res.status(400).json({ error: "Required: listingId, amount" });
    }

    // Get listing to calculate cost
    const l = await marketplaceWrite.getListing(listingId);
    if (!l.active) return res.status(400).json({ error: "Listing not active" });

    const totalCost = l.price * BigInt(amount);

    const tx = await marketplaceWrite.buyFraction(BigInt(listingId), BigInt(amount), { value: totalCost });
    const receipt = await tx.wait();

    res.json({
      listingId: Number(listingId),
      amount: Number(amount),
      totalCost: ethers.formatEther(totalCost),
      txHash: receipt.hash,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
