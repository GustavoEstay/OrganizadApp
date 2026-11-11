import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { extractContext } from "@/lib/ai/context";
import { answerQuestion } from "./answer";

export interface MockModelOptions {
  /** Delay between streamed chunks, in ms. */
  chunkDelayInMs?: number;
}

export const MOCK_MODEL_ID = "organizadapp-mock-1";

function lastUserText(prompt: LanguageModelV2Prompt): string {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const m = prompt[i]!;
    if (m.role === "user")
      return m.content
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ");
  }
  return "";
}

function systemText(prompt: LanguageModelV2Prompt): string {
  return prompt
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
}

/** What the mock "model" answers for a prompt. Pure and deterministic. */
export function mockReply(prompt: LanguageModelV2Prompt): string {
  return answerQuestion(lastUserText(prompt), extractContext(systemText(prompt)));
}

function chunkText(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [text];
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

let callCounter = 0;

/**
 * A deterministic LanguageModelV2. It implements the same interface as real providers, so
 * `streamText` and the UI message stream behave exactly as they do with Gemini.
 */
export function createMockModel(options: MockModelOptions = {}): LanguageModelV2 {
  const chunkDelayInMs = options.chunkDelayInMs ?? 18;

  const run = (callOptions: LanguageModelV2CallOptions) => {
    const text = mockReply(callOptions.prompt);
    const inputTokens = estimateTokens(JSON.stringify(callOptions.prompt));
    return { text, inputTokens };
  };

  return {
    specificationVersion: "v2",
    provider: "organizadapp-mock",
    modelId: MOCK_MODEL_ID,
    supportedUrls: {},

    async doGenerate(callOptions) {
      const { text, inputTokens } = run(callOptions);
      const outputTokens = estimateTokens(text);
      return {
        content: [{ type: "text", text }],
        finishReason: "stop",
        usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        warnings: [],
      };
    },

    async doStream(callOptions) {
      const { text, inputTokens } = run(callOptions);
      // Honour maxOutputTokens roughly, like a real provider would.
      const max = callOptions.maxOutputTokens;
      let pieces = chunkText(text);
      let finishReason: "stop" | "length" = "stop";
      if (max && estimateTokens(text) > max) {
        pieces = pieces.slice(0, Math.max(1, Math.floor(max * 0.75)));
        finishReason = "length";
      }
      const id = `mock-text-${++callCounter}`;
      const outputTokens = estimateTokens(pieces.join(""));
      const chunks: LanguageModelV2StreamPart[] = [
        { type: "stream-start", warnings: [] },
        { type: "text-start", id },
        ...pieces.map((delta): LanguageModelV2StreamPart => ({ type: "text-delta", id, delta })),
        { type: "text-end", id },
        {
          type: "finish",
          finishReason,
          usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        },
      ];
      return {
        stream: simulateReadableStream({
          chunks,
          initialDelayInMs: chunkDelayInMs * 4,
          chunkDelayInMs,
        }),
      };
    },
  };
}
