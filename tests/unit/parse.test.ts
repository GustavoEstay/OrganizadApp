import { describe, expect, it } from "vitest";
import { extractTransfers, parseTransaction, sortActivity } from "@/lib/solana/parse";
import { FAUCET, FRIEND, OWNER, makeTx, transferIx } from "./fixtures";

describe("parseTransaction", () => {
  it("parses an outgoing transfer as Sent with fee paid by the owner", () => {
    const tx = makeTx({
      accounts: [OWNER, FRIEND, "11111111111111111111111111111111"],
      instructions: [transferIx(OWNER, FRIEND, 500_000_000)],
      pre: [2_000_000_000, 0, 1],
      post: [1_499_995_000, 500_000_000, 1],
    });
    const item = parseTransaction(tx, { owner: OWNER, confirmationStatus: "finalized" });
    expect(item).toMatchObject({
      id: "sig1",
      type: "sent",
      amountSol: 0.5,
      counterparty: FRIEND,
      feeSol: 0.000005,
      feePayer: OWNER,
      status: "finalized",
      timestamp: 1_762_860_000_000,
      error: null,
    });
  });

  it("parses an incoming transfer as Received from the sender", () => {
    const tx = makeTx({
      accounts: [FRIEND, OWNER],
      instructions: [transferIx(FRIEND, OWNER, 2_000_000_000)],
    });
    const item = parseTransaction(tx, { owner: OWNER });
    expect(item).toMatchObject({
      type: "received",
      amountSol: 2,
      counterparty: FRIEND,
      feePayer: FRIEND,
      status: "confirmed",
    });
  });

  it("labels airdrops by known signature or faucet address", () => {
    const tx = makeTx({
      signature: "air1",
      accounts: [FAUCET, OWNER],
      instructions: [transferIx(FAUCET, OWNER, 1e9)],
    });
    expect(parseTransaction(tx, { owner: OWNER, airdropSignatures: new Set(["air1"]) }).type).toBe(
      "airdrop",
    );
    expect(parseTransaction(tx, { owner: OWNER, faucetAddresses: new Set([FAUCET]) }).type).toBe(
      "airdrop",
    );
    expect(parseTransaction(tx, { owner: OWNER }).type).toBe("received");
  });

  it("finds transfers inside inner (CPI) instructions", () => {
    const tx = makeTx({
      accounts: [FRIEND, OWNER, "Prog111111111111111111111111111111111111111"],
      instructions: [
        { programId: { toBase58: () => "Prog111111111111111111111111111111111111111" } },
      ],
      inner: [transferIx(FRIEND, OWNER, 250_000_000)],
    });
    expect(extractTransfers(tx)).toHaveLength(1);
    expect(parseTransaction(tx, { owner: OWNER })).toMatchObject({
      type: "received",
      amountSol: 0.25,
    });
  });

  it("nets transfers in both directions", () => {
    const tx = makeTx({
      accounts: [OWNER, FRIEND],
      instructions: [transferIx(OWNER, FRIEND, 1e9), transferIx(FRIEND, OWNER, 2.5e8)],
    });
    expect(parseTransaction(tx, { owner: OWNER })).toMatchObject({ type: "sent", amountSol: 0.75 });
  });

  it("marks failed transactions and keeps the error", () => {
    const tx = makeTx({
      accounts: [OWNER, FRIEND],
      instructions: [transferIx(OWNER, FRIEND, 1e9)],
      err: { InstructionError: [0, { Custom: 1 }] },
    });
    const item = parseTransaction(tx, { owner: OWNER, confirmationStatus: "finalized" });
    expect(item.status).toBe("failed");
    expect(item.error).toContain("InstructionError");
  });

  it("falls back to a program interaction using the balance delta (fee added back)", () => {
    const tx = makeTx({
      accounts: [OWNER, "Prog111111111111111111111111111111111111111"],
      instructions: [
        { programId: { toBase58: () => "Prog111111111111111111111111111111111111111" } },
      ],
      pre: [1_000_000_000, 0],
      post: [899_995_000, 0],
    });
    expect(parseTransaction(tx, { owner: OWNER })).toMatchObject({
      type: "other",
      amountSol: 0.1,
      counterparty: null,
    });

    const feeOnly = makeTx({ accounts: [OWNER], instructions: [], pre: [1e9], post: [1e9 - 5000] });
    expect(parseTransaction(feeOnly, { owner: OWNER }).amountSol).toBeNull();
  });

  it("ignores malformed parsed instructions", () => {
    const tx = makeTx({
      accounts: [OWNER],
      instructions: [
        {
          program: "system",
          programId: { toBase58: () => "1" },
          parsed: { type: "transfer", info: { source: 1 } },
        },
      ],
    });
    expect(extractTransfers(tx)).toEqual([]);
  });
});

describe("sortActivity", () => {
  it("puts pending items first, then newest", () => {
    const base = {
      amountSol: null,
      counterparty: null,
      feeSol: null,
      feePayer: null,
      status: "confirmed" as const,
      type: "sent" as const,
    };
    const sorted = sortActivity([
      { ...base, id: "old", timestamp: 1 },
      { ...base, id: "pending", timestamp: null },
      { ...base, id: "new", timestamp: 5 },
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["pending", "new", "old"]);
  });
});
