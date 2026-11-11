import type { InstructionLike, ParsedTransactionLike } from "@/lib/solana/parse";

export const OWNER = "7xKpQeVnS2mEw1dKk3aNYpF6PBqT4uXzLhRvG9cJ3fQa";
export const FRIEND = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
export const FAUCET = "FaucetPubkey1111111111111111111111111111111";

const key = (s: string) => ({ toBase58: () => s });
const SYSTEM = "11111111111111111111111111111111";

export function transferIx(source: string, destination: string, lamports: number): InstructionLike {
  return {
    program: "system",
    programId: key(SYSTEM),
    parsed: { type: "transfer", info: { source, destination, lamports } },
  };
}

export function makeTx(opts: {
  signature?: string;
  accounts: string[];
  instructions: InstructionLike[];
  inner?: InstructionLike[];
  fee?: number;
  pre?: number[];
  post?: number[];
  err?: unknown;
  blockTime?: number | null;
}): ParsedTransactionLike {
  return {
    slot: 123,
    blockTime: opts.blockTime === undefined ? 1_762_860_000 : opts.blockTime,
    meta: {
      fee: opts.fee ?? 5000,
      err: opts.err ?? null,
      preBalances: opts.pre ?? opts.accounts.map(() => 0),
      postBalances: opts.post ?? opts.accounts.map(() => 0),
      innerInstructions: opts.inner ? [{ instructions: opts.inner }] : null,
    },
    transaction: {
      signatures: [opts.signature ?? "sig1"],
      message: {
        accountKeys: opts.accounts.map((a, i) => ({
          pubkey: key(a),
          signer: i === 0,
          writable: true,
        })),
        instructions: opts.instructions,
      },
    },
  };
}
