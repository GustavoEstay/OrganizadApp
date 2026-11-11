export const ACTIVITY_TYPES = ["received", "sent", "airdrop", "signed-message", "other"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ActivityStatus = "confirmed" | "finalized" | "failed" | "local";

/**
 * One row in the activity list. Built from a parsed devnet transaction, or recorded locally for
 * actions that never touch the chain (signed messages).
 */
export interface ActivityItem {
  /** Transaction signature (base58) or a local id for off-chain items. */
  id: string;
  type: ActivityType;
  /** Absolute amount in SOL moved to or from the wallet, excluding the fee. */
  amountSol: number | null;
  /** The other party of a transfer, if there is one. */
  counterparty: string | null;
  /** Network fee in SOL, null for off-chain items. */
  feeSol: number | null;
  /** Who paid the fee, when known. */
  feePayer: string | null;
  status: ActivityStatus;
  /** Unix ms. Null when the cluster didn't report a block time. */
  timestamp: number | null;
  /** Error text for failed transactions. */
  error?: string | null;
  /** The signed text, for signed-message items. */
  message?: string;
  /** True when this item only exists in demo mode (no explorer link). */
  demo?: boolean;
  /** Slot of the transaction, when on chain. */
  slot?: number | null;
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  received: "Received",
  sent: "Sent",
  airdrop: "Airdrop",
  "signed-message": "Signed message",
  other: "Program interaction",
};
