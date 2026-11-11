import { describe, expect, it } from "vitest";
import { friendlyError, isValidAddress, validateSend } from "@/lib/solana/validation";
import { FRIEND, OWNER } from "./fixtures";

const SYSTEM = "11111111111111111111111111111111";

describe("isValidAddress", () => {
  it("accepts base58 public keys and rejects junk", () => {
    expect(isValidAddress(FRIEND)).toBe(true);
    expect(isValidAddress(SYSTEM)).toBe(true);
    expect(isValidAddress("not-an-address")).toBe(false);
    expect(isValidAddress("0OIl" + "1".repeat(40))).toBe(false);
    expect(isValidAddress("")).toBe(false);
  });
});

describe("validateSend", () => {
  const ctx = { from: OWNER, balanceSol: 2 };

  it("accepts a valid recipient and amount", () => {
    const res = validateSend({ recipient: ` ${FRIEND} `, amount: "0.5" }, ctx);
    expect(res.ok).toBe(true);
    expect(res.value).toEqual({ recipient: FRIEND, lamports: 500_000_000, sol: 0.5 });
  });

  it("accepts a comma as decimal separator", () => {
    expect(validateSend({ recipient: FRIEND, amount: "0,25" }, ctx).value?.lamports).toBe(
      250_000_000,
    );
  });

  it("requires both fields", () => {
    const res = validateSend({ recipient: "", amount: "" }, ctx);
    expect(res.ok).toBe(false);
    expect(res.errors.recipient).toMatch(/recipient/);
    expect(res.errors.amount).toMatch(/amount/);
  });

  it("rejects invalid addresses and sending to yourself", () => {
    expect(validateSend({ recipient: "hello", amount: "1" }, ctx).errors.recipient).toMatch(
      /valid/,
    );
    expect(validateSend({ recipient: OWNER, amount: "1" }, ctx).errors.recipient).toMatch(
      /yourself/,
    );
  });

  it("rejects bad amounts", () => {
    for (const amount of ["abc", "-1", "1e3", "0.0000000001", "1.2.3"]) {
      expect(validateSend({ recipient: FRIEND, amount }, ctx).errors.amount, amount).toBeDefined();
    }
    expect(validateSend({ recipient: FRIEND, amount: "0" }, ctx).errors.amount).toMatch(
      /greater than 0/,
    );
  });

  it("keeps room for the network fee", () => {
    expect(validateSend({ recipient: FRIEND, amount: "2" }, ctx).errors.amount).toMatch(
      /Not enough/,
    );
    expect(validateSend({ recipient: FRIEND, amount: "1.999995" }, ctx).ok).toBe(true);
    expect(validateSend({ recipient: FRIEND, amount: "1.999996" }, ctx).ok).toBe(false);
  });

  it("skips the balance check when the balance is unknown", () => {
    expect(
      validateSend({ recipient: FRIEND, amount: "1000" }, { from: OWNER, balanceSol: null }).ok,
    ).toBe(true);
  });
});

describe("friendlyError", () => {
  it("explains faucet problems", () => {
    expect(
      friendlyError(new Error("410 The RPC faucet is closed on this cluster"), "airdrop"),
    ).toMatch(/faucet\.solana\.com/);
    expect(friendlyError(new Error("429 Too Many Requests"), "airdrop")).toMatch(/rate-limited/);
  });

  it("explains wallet rejections and send failures", () => {
    expect(friendlyError(new Error("User rejected the request."), "send")).toMatch(/cancelled/);
    expect(
      friendlyError(
        new Error("Attempt to debit an account but found no record of a prior credit."),
        "send",
      ),
    ).toMatch(/Not enough/);
    expect(friendlyError(new Error("block height exceeded, blockhash expired"), "send")).toMatch(
      /explorer/,
    );
    expect(friendlyError("weird", "send")).toMatch(/Nothing was sent/);
  });
});
