import { ethers } from "ethers";
import { config } from "../../shared/config.js";
import { collateralRegistryRead, collateralTokenWrite, collateralTokenRead, marketplaceWrite, attestationWrite } from "../../shared/contracts.js";
import { publicWallet } from "../../shared/providers.js";
import { MARKETPLACE_ABI } from "../../shared/abis.js";
import { createLogger } from "../../shared/logger.js";
import * as store from "../evalStore.js";
import { runLeadAnalyst } from "./leadAnalyst.js";
import { runComplianceOfficer } from "./complianceOfficer.js";
import { runValuationAuditor } from "./valuationAuditor.js";
import { runRiskAssessor } from "./riskAssessor.js";
import { runPrivacyGuardian } from "./privacyGuardian.js";
import type { CollateralData, EvaluationResult } from "./types.js";

const log = createLogger("agent-runner");
const COL_TYPES = ["Land", "House", "Vehicle"] as const;

export async function fetchCollateralData(collateralId: number): Promise<CollateralData> {
  if (!collateralRegistryRead) throw new Error("COLLATERAL_REGISTRY_ADDRESS not configured");

  const c = await collateralRegistryRead.getCollateral(collateralId);
  if (!c.active) throw new Error(`Collateral ${collateralId} is not active`);

  const loanAmount = c.loanAmount;
  const interest = c.interest;
  const timeDays = c.timeDays;
  const startTimestamp = Number(c.startTimestamp);
  const now = Math.floor(Date.now() / 1000);
  const daysElapsed = Math.floor((now - startTimestamp) / 86400);

  const accruedInterest = (loanAmount * BigInt(interest) * BigInt(timeDays)) / (10000n * 365n);
  const totalValue = loanAmount + accruedInterest;

  return {
    collateralId,
    ownerId: c.ownerId,
    loanAmount: ethers.formatEther(loanAmount),
    timeDays: Number(timeDays),
    startTimestamp,
    interest: Number(interest),
    yield_: Number(c.yield_),
    colType: COL_TYPES[Number(c.colType)] || "Unknown",
    info: c.info,
    active: c.active,
    totalValue: ethers.formatEther(totalValue),
    daysElapsed,
  };
}

export async function runEvaluation(evalId: string, collateralId: number): Promise<void> {
  try {
    log.info(`Starting evaluation ${evalId} for collateral ${collateralId}`);

    store.emitStatus(evalId, `Fetching collateral #${collateralId} from privacy node...`, "info");
    const loanData = await fetchCollateralData(collateralId);
    store.emitStatus(evalId, `Loaded: ${loanData.colType}, ${loanData.loanAmount} ETH loan, ${loanData.daysElapsed}d elapsed`, "success");

    const eval_: EvaluationResult = {
      id: evalId,
      collateralId,
      loanData,
      agents: [],
      finalVerdict: false,
      status: "running",
      createdAt: Date.now(),
    };
    store.createEvaluation(eval_);

    // Step 1: Run Lead Analyst
    store.emitStatus(evalId, "Running Lead Analyst...", "info");
    const leadResult = await runLeadAnalyst(loanData);
    store.addAgentResult(evalId, leadResult);
    log.info(`[${evalId}] Lead Analyst: ${leadResult.approved ? "APPROVED" : "REJECTED"} (${leadResult.confidence}%)`);

    const leadAnalysis = `Decision: ${leadResult.approved ? "APPROVE" : "REJECT"} | Confidence: ${leadResult.confidence}% | Reasoning: ${leadResult.reasoning} | Flags: ${leadResult.flags.join(", ") || "none"}`;

    // Step 2: Run reviewers in parallel
    store.emitStatus(evalId, "Running 4 reviewer agents in parallel...", "info");
    const reviewerResults = await Promise.all([
      runComplianceOfficer(loanData, leadAnalysis),
      runValuationAuditor(loanData, leadAnalysis),
      runRiskAssessor(loanData, leadAnalysis),
      runPrivacyGuardian(loanData, leadAnalysis),
    ]);

    for (const result of reviewerResults) {
      store.addAgentResult(evalId, result);
      log.info(`[${evalId}] ${result.agent}: ${result.approved ? "APPROVED" : "REJECTED"} (${result.confidence}%)`);
    }

    // Step 3: Compute final verdict (all 5 must approve)
    const allResults = [leadResult, ...reviewerResults];
    const finalVerdict = allResults.every((r) => r.approved);
    const approvalCount = allResults.filter((r) => r.approved).length;
    const avgConfidence = Math.round(
      allResults.reduce((s, r) => s + r.confidence, 0) / allResults.length
    );

    store.emitStatus(evalId, `Verdict: ${finalVerdict ? "APPROVED" : "REJECTED"} — ${approvalCount}/5 agents, ${avgConfidence}% avg confidence`, finalVerdict ? "success" : "warn");

    // Post attestation on-chain
    let attestationUid: string | undefined;
    if (attestationWrite) {
      try {
        store.emitStatus(evalId, "Posting attestation to public chain...", "info");

        const summary = JSON.stringify({
          agents: allResults.map((r) => ({
            role: r.agent,
            approved: r.approved,
            confidence: r.confidence,
          })),
        });

        const tx = await attestationWrite.attest(
          BigInt(collateralId),
          finalVerdict,
          allResults.length,
          approvalCount,
          avgConfidence,
          summary,
        );

        store.emitStatus(evalId, `Attestation TX sent: ${tx.hash}`, "info");

        // Poll for receipt (RPC doesn't support filters)
        const provider = attestationWrite.runner?.provider;
        let receipt = null;
        for (let i = 0; i < 30 && !receipt; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          receipt = await provider?.getTransactionReceipt(tx.hash);
        }

        if (receipt) {
          const attestLog = receipt.logs.find((l: any) => {
            try {
              return attestationWrite!.interface.parseLog(l)?.name === "Attested";
            } catch { return false; }
          });
          const parsed = attestLog ? attestationWrite.interface.parseLog(attestLog) : null;
          attestationUid = parsed ? parsed.args[0] : undefined;
          store.emitStatus(evalId, `Attestation confirmed on-chain: ${attestationUid}`, "success");
        } else {
          attestationUid = tx.hash;
          store.emitStatus(evalId, `Attestation TX pending: ${tx.hash}`, "warn");
        }

        log.info(`[${evalId}] Attestation posted: ${attestationUid}`);
      } catch (err: any) {
        store.emitStatus(evalId, `Attestation failed: ${err.message.slice(0, 80)}`, "error");
        log.warn(`[${evalId}] Failed to post attestation: ${err.message}`);
      }
    }

    store.completeEvaluation(evalId, finalVerdict, attestationUid);
    log.info(`[${evalId}] Final verdict: ${finalVerdict ? "APPROVED" : "REJECTED"}`);

    // Auto-tokenize if approved
    if (finalVerdict && collateralTokenWrite) {
      try {
        store.emitStatus(evalId, `Minting 1000 ERC-1155 fractions on privacy node...`, "info");

        const c = await collateralRegistryRead!.getCollateral(collateralId);
        const loanAmount = c.loanAmount;
        const interest = c.interest;
        const timeDays = c.timeDays;
        const accruedInterest = (loanAmount * BigInt(interest) * BigInt(timeDays)) / (10000n * 365n);
        const totalValue = loanAmount + accruedInterest;

        const adjustedValue = (totalValue * BigInt(avgConfidence)) / 100n;
        const maxTokenCount = 1000n;

        const tokenizeTx = await collateralTokenWrite.tokenize(BigInt(collateralId), maxTokenCount);
        const tokenizeReceipt = await tokenizeTx.wait();
        store.emitStatus(evalId, `Tokenized on privacy node: ${tokenizeReceipt.hash}`, "success");
        log.info(`[${evalId}] Tokenized: ${tokenizeReceipt.hash}`);

        // Bridge to public chain
        store.emitStatus(evalId, `Bridging 1000 fractions to public chain...`, "info");
        const bridgeTx = await collateralTokenWrite.teleportToPublicChain(
          config.publicChainAddress || publicWallet.address,
          BigInt(collateralId),
          maxTokenCount,
          config.publicChainId,
          "0x",
        );
        const bridgeReceipt = await bridgeTx.wait();
        store.emitStatus(evalId, `Bridge TX confirmed on privacy node: ${bridgeReceipt.hash}`, "success");
        log.info(`[${evalId}] Bridged to public chain: ${bridgeReceipt.hash}`);

        // Wait for bridge relay then auto-list on marketplace
        if (marketplaceWrite && config.publicCollateralTokenAddress) {
          store.emitStatus(evalId, "Waiting 35s for bridge relay...", "info");
          await new Promise((r) => setTimeout(r, 35000));

          try {
            const mirrorAddress = ethers.getAddress(config.publicCollateralTokenAddress);
            const mirror = new ethers.Contract(mirrorAddress, [
              "function balanceOf(address,uint256) view returns (uint256)",
              "function setApprovalForAll(address,bool)",
              "function isApprovedForAll(address,address) view returns (bool)",
            ], publicWallet);

            const balance = await mirror.balanceOf(publicWallet.address, collateralId);
            if (balance > 0n) {
              store.emitStatus(evalId, `${balance.toString()} fractions arrived on public chain. Listing on marketplace...`, "success");

              const approved = await mirror.isApprovedForAll(publicWallet.address, config.marketplaceAddress);
              if (!approved) {
                store.emitStatus(evalId, "Approving marketplace for ERC-1155 transfers...", "info");
                const approveTx = await mirror.setApprovalForAll(config.marketplaceAddress, true);
                await approveTx.wait();
              }

              const tc = await collateralTokenRead!.getTokenizedCollateral(collateralId);

              const listTx = await marketplaceWrite.list(
                mirrorAddress,
                2,
                BigInt(collateralId),
                balance,
                tc.pricePerToken,
              );
              const listReceipt = await listTx.wait();
              store.emitStatus(evalId, `Listed on marketplace: ${listReceipt.hash} — ${ethers.formatEther(tc.pricePerToken)} USDR/fraction`, "success");
              log.info(`[${evalId}] Auto-listed on marketplace: ${listReceipt.hash}`);
            } else {
              store.emitStatus(evalId, "Bridge relay pending — fractions not yet on public chain", "warn");
              log.warn(`[${evalId}] No fractions on public chain yet — bridge may still be relaying`);
            }
          } catch (listErr: any) {
            store.emitStatus(evalId, `Marketplace listing failed: ${listErr.message.slice(0, 80)}`, "error");
            log.warn(`[${evalId}] Auto-list failed: ${listErr.message}`);
          }
        }

        store.emitStatus(evalId, "Pipeline complete", "success");
      } catch (err: any) {
        store.emitStatus(evalId, `Tokenization failed: ${err.message.slice(0, 80)}`, "error");
        log.warn(`[${evalId}] Auto-tokenize failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    store.emitStatus(evalId, `Evaluation failed: ${err.message.slice(0, 80)}`, "error");
    log.error(`[${evalId}] Evaluation failed:`, err.message);
    store.completeEvaluation(evalId, false);
  }
}

export async function getActiveCollateralIds(): Promise<number[]> {
  if (!collateralRegistryRead) throw new Error("COLLATERAL_REGISTRY_ADDRESS not configured");
  const ids: bigint[] = await collateralRegistryRead.getActiveCollaterals();
  return ids.map(Number);
}
