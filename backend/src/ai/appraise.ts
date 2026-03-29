import { config } from "../shared/config.js";
import type { AppraisalResult } from "../shared/types.js";

const SYSTEM = `You are an AI collateral appraiser for a bank. You ONLY respond with raw JSON, no prose, no markdown.`;

function buildAppraisalPrompt(data: {
  colType: string;
  loanAmount: string;
  interest: string;
  timeDays: string;
  yield_: string;
  info: string;
  totalValue: string;
}): string {
  return `Appraise this loan collateral and respond with ONLY a JSON object in this exact format:
{"score": <integer 0-100>, "reason": "<your one-sentence appraisal>"}

Score meaning: 100 = collateral is worth full claimed value, 50 = worth half, etc.
Consider: collateral type, loan terms, description quality, risk factors.

Collateral details:
- Type: ${data.colType}
- Loan Amount: ${data.loanAmount} wei
- Interest Rate: ${data.interest} basis points
- Duration: ${data.timeDays} days
- Yield Offered: ${data.yield_} basis points
- Total Value (loan + interest): ${data.totalValue} wei
- Description: ${data.info}

Respond with ONLY the JSON object. No markdown, no extra text.`;
}

function parse(text: string | null | undefined): AppraisalResult {
  if (!text) throw new Error("LLM returned empty content");

  let cleaned = text.replace(/```json?\n?|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  const j = JSON.parse(cleaned);
  const score = Math.min(100, Math.max(0, Number(j.score) || 0));
  return {
    score,
    reason: String(j.reason || ""),
  };
}

const FREE_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "minimax/minimax-m2.5:free",
  "qwen/qwen3-coder:free",
  "google/gemma-3-27b-it:free",
  "openai/gpt-oss-120b:free",
];

export async function appraiseCollateral(data: {
  colType: string;
  loanAmount: string;
  interest: string;
  timeDays: string;
  yield_: string;
  info: string;
  totalValue: string;
}): Promise<AppraisalResult> {
  const prompt = buildAppraisalPrompt(data);

  // Check if any API key is configured
  const hasKey =
    (config.aiProvider === "openrouter" && config.openrouterApiKey) ||
    (config.aiProvider === "openai" && config.openaiApiKey) ||
    (config.aiProvider === "gemini" && config.geminiApiKey) ||
    (config.aiProvider === "anthropic" && config.anthropicApiKey);

  if (!hasKey) {
    console.warn("[appraise] No AI API key configured — using default score of 85");
    return { score: 85, reason: "Default appraisal (no AI key configured)" };
  }

  if (config.aiProvider === "openrouter") {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: config.openrouterApiKey, baseURL: "https://openrouter.ai/api/v1" });

    const modelsToTry =
      config.openrouterModel === "auto"
        ? FREE_MODELS
        : [config.openrouterModel, ...FREE_MODELS.filter((m) => m !== config.openrouterModel)];

    const errors: string[] = [];
    for (const model of modelsToTry) {
      try {
        console.log(`[appraise] Trying model: ${model}`);
        const r = await client.chat.completions.create({
          model,
          max_tokens: 256,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: prompt },
          ],
        });
        if (!r.choices?.length) throw new Error("No choices returned");
        const content = r.choices[0].message.content ?? null;
        return parse(content);
      } catch (e: any) {
        console.warn(`  -> ${model} failed: ${e.message?.slice(0, 120)}`);
        errors.push(`[${model}] ${e.message?.slice(0, 120)}`);
      }
    }
    throw new Error(`All models failed:\n${errors.join("\n")}`);
  }

  if (config.aiProvider === "openai") {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: config.openaiApiKey });
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 256,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    });
    return parse(r.choices[0].message.content!);
  }

  if (config.aiProvider === "gemini") {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(config.geminiApiKey);
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
    const r = await model.generateContent(`${SYSTEM}\n\n${prompt}`);
    return parse(r.response.text());
  }

  // Default: Anthropic
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const r = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  const block = r.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return parse(block.text);
}
