import { Router } from "express";
import { ethers } from "ethers";
import { collateralRegistryRead, collateralTokenRead, redemptionVaultRead } from "../../shared/contracts.js";

const router = Router();

const COL_TYPES = ["Land", "House", "Vehicle"] as const;

// GET /collateral/all/active — list all active collaterals from registry (private node)
router.get("/all/active", async (_req, res) => {
  try {
    if (!collateralRegistryRead) return res.status(400).json({ error: "COLLATERAL_REGISTRY_ADDRESS not configured" });

    const ids: bigint[] = await collateralRegistryRead.getActiveCollaterals();
    const results = await Promise.all(
      ids.map(async (id) => {
        const c = await collateralRegistryRead!.getCollateral(id);
        const loanAmount = c.loanAmount;
        const interest = c.interest;
        const timeDays = c.timeDays;
        const startTimestamp = Number(c.startTimestamp);
        const now = Math.floor(Date.now() / 1000);
        const daysElapsed = Math.floor((now - startTimestamp) / 86400);
        const accruedInterest = (loanAmount * BigInt(interest) * BigInt(timeDays)) / (10000n * 365n);
        const totalValue = loanAmount + accruedInterest;

        // Check if already tokenized
        let tokenized = false;
        if (collateralTokenRead) {
          try {
            const tc = await collateralTokenRead.getTokenizedCollateral(id);
            tokenized = tc.tokenized;
          } catch {}
        }

        return {
          id: Number(id),
          ownerId: c.ownerId,
          colType: COL_TYPES[Number(c.colType)] || "Unknown",
          info: c.info,
          loanAmount: ethers.formatEther(loanAmount),
          loanAmountWei: loanAmount.toString(),
          interest: Number(interest),
          yield_: Number(c.yield_),
          timeDays: Number(timeDays),
          startTimestamp,
          daysElapsed,
          totalValue: ethers.formatEther(totalValue),
          totalValueWei: totalValue.toString(),
          ltv: loanAmount > 0n && totalValue > 0n
            ? Math.round(Number((loanAmount * 10000n) / totalValue)) / 100
            : 0,
          active: c.active,
          tokenized,
        };
      })
    );

    res.json(results);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

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
