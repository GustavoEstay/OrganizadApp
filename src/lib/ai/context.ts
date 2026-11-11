import { z } from "zod";
import { ACTIVITY_TYPES } from "@/lib/solana/types";

/**
 * What the browser sends along with each copilot message: the selected activity row and a
 * small wallet summary. Validated on the server; the copilot never sees keys or raw RPC data.
 */
const address = z.string().min(1).max(64);

export const activitySchema = z.object({
  id: z.string().min(1).max(128),
  type: z.enum(ACTIVITY_TYPES),
  amountSol: z.number().finite().nonnegative().nullable(),
  counterparty: address.nullable(),
  feeSol: z.number().finite().nonnegative().nullable(),
  feePayer: address.nullable(),
  status: z.enum(["confirmed", "finalized", "failed", "local"]),
  timestamp: z.number().int().nonnegative().nullable(),
  error: z.string().max(300).nullable().optional(),
  message: z.string().max(500).optional(),
  demo: z.boolean().optional(),
  slot: z.number().int().nonnegative().nullable().optional(),
});

export const walletContextSchema = z.object({
  mode: z.enum(["live", "demo", "disconnected"]),
  address: address.nullable(),
  balanceSol: z.number().finite().nonnegative().nullable(),
  recent: z.array(activitySchema).max(20),
  selected: activitySchema.nullable(),
});

export type WalletContext = z.infer<typeof walletContextSchema>;

export const EMPTY_CONTEXT: WalletContext = {
  mode: "disconnected",
  address: null,
  balanceSol: null,
  recent: [],
  selected: null,
};

const OPEN = "<wallet_context>";
const CLOSE = "</wallet_context>";

export function serializeContext(ctx: WalletContext): string {
  return `${OPEN}${JSON.stringify(ctx)}${CLOSE}`;
}

/** Reads the context block back out of a system prompt (used by the mock model). */
export function extractContext(text: string): WalletContext {
  const start = text.indexOf(OPEN);
  const end = text.indexOf(CLOSE, start);
  if (start < 0 || end < 0) return EMPTY_CONTEXT;
  try {
    const parsed = walletContextSchema.safeParse(JSON.parse(text.slice(start + OPEN.length, end)));
    return parsed.success ? parsed.data : EMPTY_CONTEXT;
  } catch {
    return EMPTY_CONTEXT;
  }
}
