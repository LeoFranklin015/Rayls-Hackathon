import { Router } from "express";
import crypto from "crypto";
import * as evalStore from "../../ai/evalStore.js";
import { runEvaluation, getActiveCollateralIds } from "../../ai/agents/runner.js";

const router = Router();

// POST /ai/evaluate — trigger evaluation for collateral IDs
router.post("/evaluate", async (req, res) => {
  try {
    let collateralIds: number[] = req.body.collateralIds;

    if (!collateralIds || !Array.isArray(collateralIds) || collateralIds.length === 0) {
      // Default: evaluate all active collaterals
      collateralIds = await getActiveCollateralIds();
    }

    if (collateralIds.length === 0) {
      return res.status(400).json({ error: "No active collaterals found" });
    }

    const evaluationIds: { collateralId: number; evalId: string }[] = [];

    for (const collateralId of collateralIds) {
      const evalId = crypto.randomUUID();
      evaluationIds.push({ collateralId, evalId });
      // Fire and forget — clients connect to SSE to follow progress
      runEvaluation(evalId, collateralId);
    }

    res.json({ evaluationIds });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /ai/evaluate/:evalId/stream — SSE stream for evaluation progress
router.get("/evaluate/:evalId/stream", (req, res) => {
  const { evalId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const eval_ = evalStore.getEvaluation(evalId);

  // If evaluation already completed, replay results and close
  if (eval_ && eval_.status === "completed") {
    for (const agent of eval_.agents) {
      res.write(`event: agent-result\ndata: ${JSON.stringify(agent)}\n\n`);
    }
    res.write(`event: final-verdict\ndata: ${JSON.stringify(eval_)}\n\n`);
    res.end();
    return;
  }

  // If evaluation is running, replay existing results then listen for new ones
  if (eval_) {
    for (const agent of eval_.agents) {
      res.write(`event: agent-result\ndata: ${JSON.stringify(agent)}\n\n`);
    }
  }

  const listener = (eventType: string, data: unknown) => {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    // Don't close on final-verdict — status events continue for tokenize/bridge/list
    // Client closes when it receives status "Pipeline complete"
  };

  evalStore.addListener(evalId, listener);

  req.on("close", () => {
    evalStore.removeListener(evalId, listener);
  });
});

// GET /ai/evaluations — all evaluations
router.get("/evaluations", (_req, res) => {
  res.json(evalStore.getAllEvaluations());
});

// GET /ai/evaluations/:collateralId — evaluations for a specific collateral
router.get("/evaluations/:collateralId", (req, res) => {
  const collateralId = Number(req.params.collateralId);
  res.json(evalStore.getEvaluationsByCollateral(collateralId));
});

// GET /ai/attestations/:collateralId — read attestations from chain
router.get("/attestations/:collateralId", async (req, res) => {
  try {
    const { attestationRead } = await import("../../shared/contracts.js");
    if (!attestationRead) return res.status(400).json({ error: "ATTESTATION_ADDRESS not configured" });

    const collateralId = Number(req.params.collateralId);
    const uids: string[] = await attestationRead.getAttestationsByCollateral(collateralId);

    const attestations = await Promise.all(
      uids.map(async (uid: string) => {
        const a = await attestationRead!.getAttestation(uid);
        return {
          uid: a.uid,
          collateralId: Number(a.collateralId),
          approved: a.approved,
          agentCount: Number(a.agentCount),
          approvalCount: Number(a.approvalCount),
          avgConfidence: Number(a.avgConfidence),
          summary: a.summary,
          attester: a.attester,
          timestamp: Number(a.timestamp),
          revoked: a.revoked,
        };
      })
    );

    res.json(attestations);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /ai/tokenize/:collateralId — tokenize after AI approval
router.post("/tokenize/:collateralId", async (req, res) => {
  try {
    const collateralId = Number(req.params.collateralId);

    // Check for passing evaluation
    const passing = evalStore.getPassingEvaluation(collateralId);
    if (!passing) {
      return res.status(400).json({ error: "No passing AI evaluation found for this collateral. Run evaluation first." });
    }

    // Also verify on-chain attestation exists
    const { attestationRead } = await import("../../shared/contracts.js");
    if (attestationRead) {
      const attested = await attestationRead.isAttested(collateralId);
      if (!attested) {
        return res.status(400).json({ error: "No on-chain attestation found. Evaluation may not have been recorded." });
      }
    }

    // Forward to the bank tokenize endpoint logic
    const { ethers } = await import("ethers");
    const { config } = await import("../../shared/config.js");
    const { collateralRegistryRead, collateralTokenWrite } = await import("../../shared/contracts.js");
    const { publicWallet } = await import("../../shared/providers.js");

    if (!collateralRegistryRead) return res.status(400).json({ error: "COLLATERAL_REGISTRY_ADDRESS not configured" });
    if (!collateralTokenWrite) return res.status(400).json({ error: "COLLATERAL_TOKEN_ADDRESS not configured" });

    const c = await collateralRegistryRead.getCollateral(collateralId);
    if (!c.active) return res.status(400).json({ error: "Collateral not active" });

    const loanAmount = c.loanAmount;
    const interest = c.interest;
    const timeDays = c.timeDays;

    const accruedInterest = (loanAmount * BigInt(interest) * BigInt(timeDays)) / (10000n * 365n);
    const totalValue = loanAmount + accruedInterest;

    // Use average confidence from agents as the appraisal score
    const avgScore = Math.round(
      passing.agents.reduce((sum, a) => sum + a.confidence, 0) / passing.agents.length
    );
    const adjustedValue = (totalValue * BigInt(avgScore)) / 100n;
    const maxTokenCount = 1000n;
    const pricePerToken = adjustedValue / maxTokenCount;

    // Tokenize
    const tokenizeTx = await collateralTokenWrite.tokenize(BigInt(collateralId), maxTokenCount);
    const tokenizeReceipt = await tokenizeTx.wait();

    // Bridge to public chain
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
      aiEvaluation: {
        evalId: passing.id,
        averageConfidence: avgScore,
        agentCount: passing.agents.length,
        allApproved: passing.finalVerdict,
      },
      adjustedValue: ethers.formatEther(adjustedValue),
      pricePerToken: ethers.formatEther(pricePerToken),
      totalFractions: "1000",
      txHashes: {
        tokenize: tokenizeReceipt.hash,
        bridge: bridgeReceipt.hash,
      },
      note: "Wait ~30s for bridge relay, then list on marketplace",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
