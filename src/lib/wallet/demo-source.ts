import bs58 from "bs58";
import nacl from "tweetnacl";
import { lamportsToSol } from "@/lib/solana/format";
import type { ActivityItem } from "@/lib/solana/types";
import { AIRDROP_SOL, BASE_FEE_LAMPORTS, LAMPORTS_PER_SOL } from "@/lib/solana/units";
import { encodeMessage, verifySignature } from "./sign";
import type { WalletSource } from "./source";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const FEE_SOL = lamportsToSol(BASE_FEE_LAMPORTS);

function keypairFromLabel(label: string) {
  const seed = new Uint8Array(32);
  const bytes = new TextEncoder().encode(label);
  for (let i = 0; i < 32; i++) seed[i] = (bytes[i % bytes.length]! * (i + 7)) & 0xff;
  return nacl.sign.keyPair.fromSeed(seed);
}

/** Demo keys are derived from fixed seeds: real, valid addresses that hold nothing. */
const demoKeypair = keypairFromLabel("organizadapp-demo-wallet");
export const DEMO_ADDRESS = bs58.encode(demoKeypair.publicKey);
export const DEMO_FRIEND = bs58.encode(keypairFromLabel("demo-friend").publicKey);
export const DEMO_SHOP = bs58.encode(keypairFromLabel("demo-shop").publicKey);
export const DEMO_FAUCET = bs58.encode(keypairFromLabel("demo-faucet").publicKey);

function fakeSignature(n: number): string {
  const bytes = new Uint8Array(64);
  for (let i = 0; i < 64; i++) bytes[i] = (n * 31 + i * 17 + ((n * i) % 251)) & 0xff;
  return bs58.encode(bytes);
}

export function seedDemoActivity(now: number): ActivityItem[] {
  const base = { demo: true, slot: null, error: null } as const;
  return [
    {
      ...base,
      id: fakeSignature(1),
      type: "received",
      amountSol: 2,
      counterparty: DEMO_FRIEND,
      feeSol: FEE_SOL,
      feePayer: DEMO_FRIEND,
      status: "finalized",
      timestamp: now - 1 * DAY - 2 * HOUR,
    },
    {
      ...base,
      id: fakeSignature(2),
      type: "sent",
      amountSol: 0.5,
      counterparty: DEMO_SHOP,
      feeSol: FEE_SOL,
      feePayer: DEMO_ADDRESS,
      status: "finalized",
      timestamp: now - 1 * DAY - 5 * HOUR,
    },
    {
      ...base,
      id: "local-sig-demo-1",
      type: "signed-message",
      amountSol: null,
      counterparty: null,
      feeSol: null,
      feePayer: null,
      status: "local",
      timestamp: now - 1 * DAY - 7 * HOUR,
      message: "OrganizadApp: I control this wallet",
    },
    {
      ...base,
      id: fakeSignature(3),
      type: "airdrop",
      amountSol: 5,
      counterparty: DEMO_FAUCET,
      feeSol: FEE_SOL,
      feePayer: DEMO_FAUCET,
      status: "finalized",
      timestamp: now - 1 * DAY - 9 * HOUR,
    },
    {
      ...base,
      id: fakeSignature(4),
      type: "received",
      amountSol: 6.48,
      counterparty: DEMO_FRIEND,
      feeSol: FEE_SOL,
      feePayer: DEMO_FRIEND,
      status: "finalized",
      timestamp: now - 4 * DAY,
    },
    {
      ...base,
      id: fakeSignature(5),
      type: "sent",
      amountSol: 1.2,
      counterparty: DEMO_SHOP,
      feeSol: FEE_SOL,
      feePayer: DEMO_ADDRESS,
      status: "failed",
      error: "InsufficientFundsForRent",
      timestamp: now - 6 * DAY,
    },
  ];
}

export interface DemoOptions {
  latencyMs?: number;
  now?: () => number;
  /** Minimum time between demo airdrops, to show the faucet rate-limit path. */
  airdropCooldownMs?: number;
}

/**
 * In-memory wallet with realistic data, used for visitors without Phantom. It behaves like the
 * live one (latency, validation, rate-limited faucet) and really signs messages with an
 * ed25519 demo key, so "Sign message" verifies for real.
 */
export function createDemoSource(options: DemoOptions = {}): WalletSource {
  const latency = options.latencyMs ?? 450;
  const now = options.now ?? Date.now;
  const cooldown = options.airdropCooldownMs ?? 30_000;
  let lamports = Math.round(12.48 * LAMPORTS_PER_SOL);
  let activity = seedDemoActivity(now());
  let lastAirdrop = -Infinity;
  let counter = 100;

  const wait = () => new Promise((r) => setTimeout(r, latency));

  return {
    mode: "demo",
    address: DEMO_ADDRESS,
    canSignMessage: true,

    async getBalance() {
      await wait();
      return lamportsToSol(lamports);
    },

    async getActivity() {
      await wait();
      return [...activity];
    },

    async requestAirdrop() {
      await wait();
      if (now() - lastAirdrop < cooldown) {
        throw new Error("429 Too Many Requests: airdrop rate limit reached (demo)");
      }
      lastAirdrop = now();
      lamports += AIRDROP_SOL * LAMPORTS_PER_SOL;
      const signature = fakeSignature(++counter);
      activity = [
        {
          id: signature,
          type: "airdrop",
          amountSol: AIRDROP_SOL,
          counterparty: DEMO_FAUCET,
          feeSol: FEE_SOL,
          feePayer: DEMO_FAUCET,
          status: "confirmed",
          timestamp: now(),
          demo: true,
          slot: null,
          error: null,
        },
        ...activity,
      ];
      return { signature };
    },

    async send(recipient, amountLamports) {
      await wait();
      if (amountLamports + BASE_FEE_LAMPORTS > lamports) throw new Error("insufficient funds");
      lamports -= amountLamports + BASE_FEE_LAMPORTS;
      const signature = fakeSignature(++counter);
      activity = [
        {
          id: signature,
          type: "sent",
          amountSol: lamportsToSol(amountLamports),
          counterparty: recipient,
          feeSol: FEE_SOL,
          feePayer: DEMO_ADDRESS,
          status: "confirmed",
          timestamp: now(),
          demo: true,
          slot: null,
          error: null,
        },
        ...activity,
      ];
      return { signature };
    },

    async signMessage(text) {
      await wait();
      const message = encodeMessage(text);
      const signature = nacl.sign.detached(message, demoKeypair.secretKey);
      const verified = verifySignature(message, signature, demoKeypair.publicKey);
      const encoded = bs58.encode(signature);
      const item: ActivityItem = {
        id: `local-${encoded.slice(0, 16)}`,
        type: "signed-message",
        amountSol: null,
        counterparty: null,
        feeSol: null,
        feePayer: null,
        status: "local",
        timestamp: now(),
        message: text,
        demo: true,
      };
      activity = [item, ...activity];
      return { signature: encoded, verified, item };
    },
  };
}
