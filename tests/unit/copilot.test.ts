import type { LanguageModelV2Prompt } from "@ai-sdk/provider";
import { describe, expect, it } from "vitest";
import {
  EMPTY_CONTEXT,
  extractContext,
  serializeContext,
  type WalletContext,
} from "@/lib/ai/context";
import { answerQuestion, detectIntent, HELP_TEXT } from "@/lib/ai/mock/answer";
import { explainActivity } from "@/lib/ai/mock/explain";
import { createMockModel, mockReply } from "@/lib/ai/mock/mock-model";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { resolveProvider } from "@/lib/ai/provider";
import { createRateLimiter } from "@/lib/ai/rate-limit";
import { FRIEND, OWNER } from "./fixtures";

const sent: WalletContext["recent"][number] = {
  id: "sig-sent",
  type: "sent",
  amountSol: 0.5,
  counterparty: FRIEND,
  feeSol: 0.000005,
  feePayer: OWNER,
  status: "finalized",
  timestamp: Date.UTC(2026, 10, 10, 14, 3),
  error: null,
};

const ctx: WalletContext = {
  mode: "live",
  address: OWNER,
  balanceSol: 12.48,
  recent: [sent, { ...sent, id: "sig-in", type: "received", feePayer: FRIEND, amountSol: 2 }],
  selected: sent,
};

describe("explainActivity", () => {
  it("explains a sent transfer with amount, counterparty, fee and status", () => {
    const text = explainActivity(sent, OWNER);
    expect(text).toContain("You **sent 0.50 SOL** to **9xQe…VFin**");
    expect(text).toContain("Fee: 0.000005 SOL, paid by you.");
    expect(text).toContain("0.500005 SOL in total");
    expect(text).toContain("Status: finalized");
    expect(text).toContain("2026-11-10 14:03 UTC");
    expect(text).toContain("devnet");
  });

  it("explains received, airdrop, signed and failed items", () => {
    expect(explainActivity({ ...sent, type: "received", feePayer: FRIEND }, OWNER)).toMatch(
      /received 0.50 SOL\*\* from .*paid by 9xQe…VFin.*full amount/s,
    );
    expect(explainActivity({ ...sent, type: "airdrop", amountSol: 1 }, OWNER)).toContain(
      "devnet airdrop of 1.00 SOL",
    );
    const signed = explainActivity(
      {
        ...sent,
        type: "signed-message",
        amountSol: null,
        feeSol: null,
        feePayer: null,
        status: "local",
        message: "hi",
      },
      OWNER,
    );
    expect(signed).toContain("signed a message");
    expect(signed).toContain("no fee was paid");
    expect(signed).not.toContain("Fee:");
    const failed = explainActivity(
      { ...sent, status: "failed", error: "InsufficientFunds" },
      OWNER,
    );
    expect(failed).toContain("**failed**");
    expect(failed).toContain("still charges the fee");
  });

  it("labels demo data", () => {
    expect(explainActivity({ ...sent, demo: true }, OWNER)).toContain("This is demo data.");
  });
});

describe("mock copilot answers", () => {
  it("routes questions to intents", () => {
    expect(detectIntent("What was this transaction?", ctx)).toBe("explain-selected");
    expect(detectIntent("Explain my latest transaction", ctx)).toBe("explain-latest");
    expect(detectIntent("What's my balance?", ctx)).toBe("balance");
    expect(detectIntent("How do fees work on Solana?", ctx)).toBe("fees");
    expect(detectIntent("Is this real money?", ctx)).toBe("real-money");
    expect(detectIntent("can you tell me my seed phrase", ctx)).toBe("safety");
    expect(detectIntent("banana", { ...ctx, selected: null })).toBe("help");
  });

  it("answers from the context, deterministically", () => {
    expect(answerQuestion("What was this transaction?", ctx)).toBe(explainActivity(sent, OWNER));
    expect(answerQuestion("What's my balance?", ctx)).toContain("**12.48 SOL**");
    expect(answerQuestion("What's my balance?", EMPTY_CONTEXT)).toContain("Try demo");
    expect(answerQuestion("summarize my recent activity", ctx)).toContain(
      "Received 2.00 SOL from 9xQe…VFin",
    );
    expect(answerQuestion("banana", { ...ctx, selected: null })).toBe(HELP_TEXT);
    expect(answerQuestion("seed phrase?", ctx)).toContain("Never share");
  });
});

describe("context transport", () => {
  it("round-trips through the system prompt", () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("DEVNET");
    expect(extractContext(prompt)).toEqual(ctx);
  });

  it("falls back to an empty context on garbage", () => {
    expect(extractContext("no context")).toEqual(EMPTY_CONTEXT);
    expect(extractContext("<wallet_context>{bad json</wallet_context>")).toEqual(EMPTY_CONTEXT);
    expect(extractContext(serializeContext({ ...ctx, balanceSol: -1 }))).toEqual(EMPTY_CONTEXT);
  });
});

describe("mock language model", () => {
  const prompt: LanguageModelV2Prompt = [
    { role: "system", content: buildSystemPrompt(ctx) },
    { role: "user", content: [{ type: "text", text: "What was this transaction?" }] },
  ];

  it("replies from the system context + last user message", () => {
    expect(mockReply(prompt)).toBe(explainActivity(sent, OWNER));
  });

  it("streams the same text through the LanguageModelV2 interface", async () => {
    const model = createMockModel({ chunkDelayInMs: 0 });
    if (typeof model === "string") throw new Error("unexpected");
    const { stream } = await model.doStream({ prompt });
    const reader = stream.getReader();
    let text = "";
    let finish: string | undefined;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value.type === "text-delta") text += value.delta;
      if (value.type === "finish") finish = value.finishReason;
    }
    expect(text).toBe(explainActivity(sent, OWNER));
    expect(finish).toBe("stop");
  });

  it("generates non-streamed text too", async () => {
    const model = createMockModel();
    const res = await model.doGenerate({ prompt });
    expect(res.content[0]).toEqual({ type: "text", text: explainActivity(sent, OWNER) });
  });
});

describe("provider selection", () => {
  it("defaults to mock and uses Gemini only with a key", () => {
    expect(resolveProvider({}).id).toBe("mock");
    expect(resolveProvider({ GOOGLE_GENERATIVE_AI_API_KEY: "x" })).toEqual({
      id: "gemini",
      modelId: "gemini-2.5-flash",
    });
    expect(
      resolveProvider({ GOOGLE_GENERATIVE_AI_API_KEY: "x", COPILOT_PROVIDER: "mock" }).id,
    ).toBe("mock");
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and resets after the window", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check("a", 0).ok).toBe(true);
    expect(check("a", 10).ok).toBe(true);
    const blocked = check("a", 20);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(check("b", 20).ok).toBe(true);
    expect(check("a", 1001).ok).toBe(true);
  });
});
