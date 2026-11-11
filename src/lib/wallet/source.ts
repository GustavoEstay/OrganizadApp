import type { ActivityItem } from "@/lib/solana/types";

export type WalletMode = "live" | "demo";

export interface SendResult {
  signature: string;
}

export interface SignResult {
  /** base58 ed25519 signature. */
  signature: string;
  /** Result of verifying the signature against the wallet's public key. */
  verified: boolean;
  item: ActivityItem;
}

/**
 * Everything the UI needs from a wallet. The live implementation talks to devnet through the
 * connected Phantom wallet; the demo one is in memory. Components and react-query hooks only
 * see this interface, so both modes share one code path.
 */
export interface WalletSource {
  mode: WalletMode;
  address: string;
  canSignMessage: boolean;
  getBalance(): Promise<number>;
  getActivity(): Promise<ActivityItem[]>;
  requestAirdrop(): Promise<SendResult>;
  send(recipient: string, lamports: number): Promise<SendResult>;
  signMessage(text: string): Promise<SignResult>;
}
