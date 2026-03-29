import { Router } from "express";
import { ethers } from "ethers";
import { config } from "../../shared/config.js";
import {
  collateralRegistryWrite,
  collateralRegistryRead,
  collateralTokenWrite,
  collateralTokenRead,
  marketplaceWrite,
  redemptionVaultRead,
  redemptionVaultWrite,
} from "../../shared/contracts.js";
import { publicWallet } from "../../shared/providers.js";
import { COLLATERAL_TOKEN_ABI, MARKETPLACE_ABI } from "../../shared/abis.js";
import { appraiseCollateral } from "../../ai/appraise.js";

const router = Router();

const COL_TYPES = ["Land", "House", "Vehicle"] as const;

// ── POST /bank/loan — Create a new collateral loan ─────────────────────

router.post("/loan", async (req, res) => {
  try {
    if (!collateralRegistryWrite) return res.status(400).json({ error: "COLLATERAL_REGISTRY_ADDRESS not configured" });

    const { ownerId, loanAmount, timeDays, interest, yield_, colType, info } = req.body;
    if (!ownerId || !loanAmount || !timeDays || interest === undefined || yield_ === undefined || colType === undefined || !info) {
      return res.status(400).json({ error: "Required: ownerId, loanAmount, timeDays, interest, yield_, colType (0=Land,1=House,2=Vehicle), info" });
    }

    const tx = await collateralRegistryWrite.addCollateral(
      ownerId,
      ethers.parseEther(String(loanAmount)),
      BigInt(timeDays),
      BigInt(Math.floor(Date.now() / 1000)),
      BigInt(interest),
      BigInt(yield_),
      Number(colType),
      String(info),
    );
    const receipt = await tx.wait();

    // Extract collateralId from CollateralAdded event
    const log = receipt.logs.find((l: any) => {
      try {
        return collateralRegistryWrite!.interface.parseLog(l)?.name === "CollateralAdded";
      } catch { return false; }
    });
    const parsed = log ? collateralRegistryWrite.interface.parseLog(log) : null;
    const collateralId = parsed ? parsed.args[0].toString() : "unknown";

    res.json({
      collateralId,
      txHash: receipt.hash,
      status: receipt.status,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /bank/tokenize/:collateralId — AI appraise + mint + bridge ────

router.post("/tokenize/:collateralId", async (req, res) => {
  try {
    if (!collateralRegistryRead) return res.status(400).json({ error: "COLLATERAL_REGISTRY_ADDRESS not configured" });
    if (!collateralTokenWrite) return res.status(400).json({ error: "COLLATERAL_TOKEN_ADDRESS not configured" });

    const collateralId = req.params.collateralId;

    // 1. Read collateral from registry
    const c = await collateralRegistryRead.getCollateral(collateralId);
    if (!c.active) return res.status(400).json({ error: "Collateral not active" });

    const loanAmount = c.loanAmount;
    const interest = c.interest;
    const timeDays = c.timeDays;
    const yield_ = c.yield_;
    const colType = Number(c.colType);

    // Calculate total value
    const accruedInterest = (loanAmount * interest * timeDays) / (10000n * 365n);
    const totalValue = loanAmount + accruedInterest;

    // 2. AI appraisal
    const appraisal = await appraiseCollateral({
      colType: COL_TYPES[colType] || "Unknown",
      loanAmount: loanAmount.toString(),
      interest: interest.toString(),
      timeDays: timeDays.toString(),
      yield_: yield_.toString(),
      info: c.info,
      totalValue: totalValue.toString(),
    });

    // 3. Calculate adjusted value
    const adjustedValue = (totalValue * BigInt(appraisal.score)) / 100n;
    const maxTokenCount = 1000n;
    const pricePerToken = adjustedValue / maxTokenCount;

    // 4. Tokenize (mint 1000 fractions on privacy chain)
    const tokenizeTx = await collateralTokenWrite.tokenize(BigInt(collateralId), maxTokenCount);
    const tokenizeReceipt = await tokenizeTx.wait();

    // 5. Bridge to deployer's public chain address
    // Need to use the registered key for teleport — the collateralTokenWrite wallet
    const bridgeTx = await collateralTokenWrite.teleportToPublicChain(
      config.publicChainAddress || publicWallet.address,
      BigInt(collateralId),
      maxTokenCount,
      config.publicChainId,
      "0x",
    );
    const bridgeReceipt = await bridgeTx.wait();

    res.json({
      collateralId,
      aiAppraisal: {
        score: appraisal.score,
        reason: appraisal.reason,
        adjustedValue: ethers.formatEther(adjustedValue),
        adjustedValueWei: adjustedValue.toString(),
      },
      pricePerToken: ethers.formatEther(pricePerToken),
      pricePerTokenWei: pricePerToken.toString(),
      totalFractions: "1000",
      txHashes: {
        tokenize: tokenizeReceipt.hash,
        bridge: bridgeReceipt.hash,
      },
      note: "Wait ~30s for bridge relay, then call POST /bank/list/" + collateralId,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /bank/list/:collateralId — List fractions on marketplace ──────

router.post("/list/:collateralId", async (req, res) => {
  try {
    if (!collateralTokenRead) return res.status(400).json({ error: "COLLATERAL_TOKEN_ADDRESS not configured" });
    if (!marketplaceWrite) return res.status(400).json({ error: "MARKETPLACE_ADDRESS not configured" });

    const collateralId = req.params.collateralId;
    const rawMirrorAddress = config.publicCollateralTokenAddress;
    if (!rawMirrorAddress) return res.status(400).json({ error: "PUBLIC_COLLATERAL_TOKEN_ADDRESS not configured" });
    const mirrorAddress = ethers.getAddress(rawMirrorAddress);

    // Read tokenized info for price
    const tc = await collateralTokenRead.getTokenizedCollateral(collateralId);
    if (!tc.tokenized) return res.status(400).json({ error: "Collateral not tokenized" });

    // Check mirror balance
    const mirror = new ethers.Contract(mirrorAddress, [
      "function balanceOf(address,uint256) view returns (uint256)",
      "function setApprovalForAll(address,bool)",
      "function isApprovedForAll(address,address) view returns (bool)",
    ], publicWallet);

    const balance = await mirror.balanceOf(publicWallet.address, collateralId);
    if (balance === 0n) return res.status(400).json({ error: "No fractions on public chain yet. Wait for bridge relay (~30s)." });

    // Approve marketplace if needed
    const approved = await mirror.isApprovedForAll(publicWallet.address, config.marketplaceAddress);
    if (!approved) {
      const approveTx = await mirror.setApprovalForAll(config.marketplaceAddress, true);
      await approveTx.wait();
    }

    // List on marketplace (assetType 2 = ERC1155)
    const listTx = await marketplaceWrite.list(
      mirrorAddress,
      2, // ERC1155
      BigInt(collateralId),
      balance,
      tc.pricePerToken,
    );
    const listReceipt = await listTx.wait();

    // Extract listingId from Listed event
    const marketplace = new ethers.Contract(config.marketplaceAddress, MARKETPLACE_ABI, publicWallet);
    const log = listReceipt.logs.find((l: any) => {
      try { return marketplace.interface.parseLog(l)?.name === "Listed"; }
      catch { return false; }
    });
    const parsed = log ? marketplace.interface.parseLog(log) : null;
    const listingId = parsed ? parsed.args[0].toString() : "unknown";

    res.json({
      listingId,
      collateralId,
      amount: balance.toString(),
      pricePerToken: ethers.formatEther(tc.pricePerToken),
      pricePerTokenWei: tc.pricePerToken.toString(),
      txHash: listReceipt.hash,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /bank/fill/:collateralId — Fill collateral, pay holders ───────

router.post("/fill/:collateralId", async (req, res) => {
  try {
    if (!redemptionVaultWrite) return res.status(400).json({ error: "REDEMPTION_VAULT_ADDRESS not configured" });
    if (!collateralTokenRead) return res.status(400).json({ error: "COLLATERAL_TOKEN_ADDRESS not configured" });

    const collateralId = req.params.collateralId;

    // Read tokenized info
    const tc = await collateralTokenRead.getTokenizedCollateral(collateralId);
    if (!tc.tokenized) return res.status(400).json({ error: "Collateral not tokenized" });

    // Check vault state
    const isFilled = await redemptionVaultRead!.isFilled(collateralId);
    if (isFilled) return res.status(400).json({ error: "Already filled" });

    const fractionsSold = await redemptionVaultRead!.fractionsSold(collateralId);
    if (fractionsSold === 0n) return res.status(400).json({ error: "No fractions sold yet" });

    // Calculate required deposit: sold * pricePerToken * (10000 + yield) / 10000
    const yieldBps = tc.yieldBasisPoints;
    const payoutPerFraction = (tc.pricePerToken * (10000n + yieldBps)) / 10000n;
    const totalRequired = fractionsSold * payoutPerFraction;

    // Fill
    const fillTx = await redemptionVaultWrite.fillCollateral(
      BigInt(collateralId),
      tc.pricePerToken,
      yieldBps,
      { value: totalRequired },
    );
    const fillReceipt = await fillTx.wait();

    res.json({
      collateralId,
      fractionsSold: fractionsSold.toString(),
      pricePerToken: ethers.formatEther(tc.pricePerToken),
      yieldBasisPoints: Number(yieldBps),
      totalPaid: ethers.formatEther(totalRequired),
      totalPaidWei: totalRequired.toString(),
      txHash: fillReceipt.hash,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
