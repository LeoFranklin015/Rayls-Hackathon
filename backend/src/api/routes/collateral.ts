import { Router } from "express";
import { ethers } from "ethers";
import { collateralTokenRead, redemptionVaultRead } from "../../shared/contracts.js";

const router = Router();

// GET /collateral/all/tokenized — list all tokenized collateral IDs
router.get("/all/tokenized", async (_req, res) => {
  try {
    if (!collateralTokenRead) return res.status(400).json({ error: "COLLATERAL_TOKEN_ADDRESS not configured" });
    const ids: bigint[] = await collateralTokenRead.getTokenizedIds();
    res.json(ids.map((id) => id.toString()));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /collateral/:id — tokenized collateral info from privacy chain
router.get("/:id", async (req, res) => {
  try {
    if (!collateralTokenRead) return res.status(400).json({ error: "COLLATERAL_TOKEN_ADDRESS not configured" });
    const tc = await collateralTokenRead.getTokenizedCollateral(req.params.id);
    const filled = redemptionVaultRead ? await redemptionVaultRead.isFilled(req.params.id) : false;
    const sold = redemptionVaultRead ? await redemptionVaultRead.fractionsSold(req.params.id) : 0n;
    res.json({
      collateralId: tc.collateralId.toString(),
      maxTokenCount: tc.maxTokenCount.toString(),
      pricePerToken: ethers.formatEther(tc.pricePerToken),
      pricePerTokenWei: tc.pricePerToken.toString(),
      totalValue: ethers.formatEther(tc.totalValue),
      totalValueWei: tc.totalValue.toString(),
      yieldBasisPoints: Number(tc.yieldBasisPoints),
      tokenized: tc.tokenized,
      filled,
      fractionsSold: sold.toString(),
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /collateral/:id/holders — holder list and amounts
router.get("/:id/holders", async (req, res) => {
  try {
    if (!redemptionVaultRead) return res.status(400).json({ error: "REDEMPTION_VAULT_ADDRESS not configured" });
    const holders: string[] = await redemptionVaultRead.getHolders(req.params.id);
    const details = await Promise.all(
      holders.map(async (addr) => {
        const amount = await redemptionVaultRead!.holdings(req.params.id, addr);
        return { address: addr, amount: amount.toString() };
      }),
    );
    res.json(details.filter((d) => BigInt(d.amount) > 0n));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
