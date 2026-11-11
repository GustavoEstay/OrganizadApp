import bs58 from "bs58";
import { describe, expect, it } from "vitest";
import { createDemoSource, DEMO_ADDRESS, seedDemoActivity } from "@/lib/wallet/demo-source";
import { readLog, updateLog, type KeyValueStorage } from "@/lib/wallet/local-log";
import { encodeMessage, verifySignature } from "@/lib/wallet/sign";
import { isValidAddress } from "@/lib/solana/validation";
import { FRIEND } from "./fixtures";

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

describe("demo wallet", () => {
  it("uses a valid address and realistic seeded activity", () => {
    expect(isValidAddress(DEMO_ADDRESS)).toBe(true);
    const items = seedDemoActivity(Date.now());
    expect(items.map((i) => i.type)).toEqual([
      "received",
      "sent",
      "signed-message",
      "airdrop",
      "received",
      "sent",
    ]);
    expect(items.every((i) => i.demo)).toBe(true);
  });

  it("sends, airdrops (with a cooldown) and updates the balance", async () => {
    let t = 1_000_000;
    const demo = createDemoSource({ latencyMs: 0, now: () => t, airdropCooldownMs: 30_000 });
    expect(await demo.getBalance()).toBe(12.48);

    await demo.send(FRIEND, 480_000_000);
    expect(await demo.getBalance()).toBeCloseTo(11.999995, 9);
    expect((await demo.getActivity())[0]).toMatchObject({
      type: "sent",
      amountSol: 0.48,
      counterparty: FRIEND,
    });

    await demo.requestAirdrop();
    await expect(demo.requestAirdrop()).rejects.toThrow(/429/);
    t += 31_000;
    await demo.requestAirdrop();
    expect(await demo.getBalance()).toBeCloseTo(13.999995, 9);
  });

  it("refuses to overspend", async () => {
    const demo = createDemoSource({ latencyMs: 0 });
    await expect(demo.send(FRIEND, 13e9)).rejects.toThrow(/insufficient/);
  });

  it("signs messages with a real ed25519 key that verifies", async () => {
    const demo = createDemoSource({ latencyMs: 0 });
    const res = await demo.signMessage("hello devnet");
    expect(res.verified).toBe(true);
    const ok = verifySignature(
      encodeMessage("hello devnet"),
      bs58.decode(res.signature),
      bs58.decode(DEMO_ADDRESS),
    );
    expect(ok).toBe(true);
    expect(
      verifySignature(
        encodeMessage("tampered"),
        bs58.decode(res.signature),
        bs58.decode(DEMO_ADDRESS),
      ),
    ).toBe(false);
    expect((await demo.getActivity())[0]).toMatchObject({
      type: "signed-message",
      message: "hello devnet",
    });
  });
});

describe("local log", () => {
  it("persists airdrop signatures per address and survives bad data", () => {
    const store = memoryStorage();
    updateLog("A", (log) => ({ ...log, airdrops: ["sig1", ...log.airdrops] }), store);
    expect(readLog("A", store).airdrops).toEqual(["sig1"]);
    expect(readLog("B", store).airdrops).toEqual([]);
    store.setItem("organizadapp:v1:C", "{not json");
    expect(readLog("C", store)).toEqual({ signed: [], airdrops: [] });
    expect(readLog("A", null)).toEqual({ signed: [], airdrops: [] });
  });
});
