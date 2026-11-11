import { lamportsToSol } from "./format";
import type { ActivityItem, ActivityStatus } from "./types";

/**
 * Structural subset of web3.js' `ParsedTransactionWithMeta`. Typing against the shape (not the
 * class) keeps this module pure and lets tests build fixtures as plain objects.
 */
interface KeyLike {
  toBase58(): string;
}
export interface InstructionLike {
  programId: KeyLike;
  program?: string;
  parsed?: unknown;
}
export interface ParsedTransactionLike {
  slot: number;
  blockTime?: number | null;
  meta: {
    fee: number;
    err: unknown;
    preBalances: number[];
    postBalances: number[];
    innerInstructions?: { instructions: InstructionLike[] }[] | null;
  } | null;
  transaction: {
    signatures: string[];
    message: {
      accountKeys: { pubkey: KeyLike; signer: boolean; writable: boolean }[];
      instructions: InstructionLike[];
    };
  };
}

export interface ParseContext {
  /** The wallet whose point of view we describe. */
  owner: string;
  /** Signatures this app requested as airdrops (the RPC doesn't label them). */
  airdropSignatures?: ReadonlySet<string>;
  /** Faucet addresses whose incoming transfers count as airdrops. */
  faucetAddresses?: ReadonlySet<string>;
  /** Commitment reported by getSignaturesForAddress, if any. */
  confirmationStatus?: string | null;
}

interface Transfer {
  source: string;
  destination: string;
  lamports: number;
}

const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

function asTransfer(ix: InstructionLike): Transfer | null {
  const isSystem = ix.program === "system" || ix.programId.toBase58() === SYSTEM_PROGRAM_ID;
  if (!isSystem || typeof ix.parsed !== "object" || ix.parsed === null) return null;
  const parsed = ix.parsed as { type?: unknown; info?: Record<string, unknown> };
  if (parsed.type !== "transfer" && parsed.type !== "transferWithSeed") return null;
  const info = parsed.info ?? {};
  const { source, destination, lamports } = info;
  if (typeof source !== "string" || typeof destination !== "string") return null;
  const amount = typeof lamports === "number" ? lamports : Number(lamports);
  if (!Number.isFinite(amount)) return null;
  return { source, destination, lamports: amount };
}

/** All system transfers in a transaction, top-level and inner (CPI) instructions. */
export function extractTransfers(tx: ParsedTransactionLike): Transfer[] {
  const inner = tx.meta?.innerInstructions?.flatMap((group) => group.instructions) ?? [];
  return [...tx.transaction.message.instructions, ...inner]
    .map(asTransfer)
    .filter((t): t is Transfer => t !== null);
}

function errorText(err: unknown): string | null {
  if (err == null) return null;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Transaction failed";
  }
}

function statusOf(err: unknown, confirmationStatus?: string | null): ActivityStatus {
  if (err != null) return "failed";
  return confirmationStatus === "finalized" ? "finalized" : "confirmed";
}

/**
 * Turns a parsed transaction into an activity row from the owner's point of view:
 * Sent / Received / Airdrop from system transfers, with a balance-delta fallback for anything
 * else (program interactions).
 */
export function parseTransaction(tx: ParsedTransactionLike, ctx: ParseContext): ActivityItem {
  const signature = tx.transaction.signatures[0] ?? "unknown";
  const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
  const feePayer = keys[0] ?? null;
  const fee = tx.meta?.fee ?? 0;
  const err = tx.meta?.err ?? null;

  const base = {
    id: signature,
    feeSol: lamportsToSol(fee),
    feePayer,
    status: statusOf(err, ctx.confirmationStatus),
    timestamp: tx.blockTime != null ? tx.blockTime * 1000 : null,
    error: errorText(err),
    slot: tx.slot,
  } satisfies Partial<ActivityItem>;

  const transfers = extractTransfers(tx);
  const outgoing = transfers.filter((t) => t.source === ctx.owner && t.destination !== ctx.owner);
  const incoming = transfers.filter((t) => t.destination === ctx.owner && t.source !== ctx.owner);
  const sum = (ts: Transfer[]) => ts.reduce((n, t) => n + t.lamports, 0);
  const outLamports = sum(outgoing);
  const inLamports = sum(incoming);

  if (outLamports > 0 && outLamports >= inLamports) {
    return {
      ...base,
      type: "sent",
      amountSol: lamportsToSol(outLamports - inLamports),
      counterparty: outgoing[0]!.destination,
    };
  }

  if (inLamports > 0) {
    const source = incoming[0]!.source;
    const isAirdrop =
      ctx.airdropSignatures?.has(signature) === true || ctx.faucetAddresses?.has(source) === true;
    return {
      ...base,
      type: isAirdrop ? "airdrop" : "received",
      amountSol: lamportsToSol(inLamports - outLamports),
      counterparty: source,
    };
  }

  // Fallback: no system transfer touching the owner. Describe the net balance change, with the
  // fee added back when the owner paid it so the amount reflects value moved, not gas.
  const index = keys.indexOf(ctx.owner);
  const pre = index >= 0 ? (tx.meta?.preBalances[index] ?? 0) : 0;
  const post = index >= 0 ? (tx.meta?.postBalances[index] ?? 0) : 0;
  const net = post - pre + (feePayer === ctx.owner ? fee : 0);
  if (ctx.airdropSignatures?.has(signature) && net > 0) {
    return { ...base, type: "airdrop", amountSol: lamportsToSol(net), counterparty: null };
  }
  return {
    ...base,
    type: "other",
    amountSol: net === 0 ? null : lamportsToSol(Math.abs(net)),
    counterparty: null,
  };
}

/** Newest first; items without a block time (just submitted) go on top. */
export function sortActivity(items: ActivityItem[]): ActivityItem[] {
  return [...items].sort(
    (a, b) => (b.timestamp ?? Number.MAX_SAFE_INTEGER) - (a.timestamp ?? Number.MAX_SAFE_INTEGER),
  );
}
