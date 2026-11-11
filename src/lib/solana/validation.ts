import { PublicKey } from "@solana/web3.js";
import { BASE_FEE_LAMPORTS } from "./units";
import { lamportsToSol, solToLamports } from "./format";

export function isValidAddress(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 32 || trimmed.length > 44) return false;
  try {
    new PublicKey(trimmed);
    return true;
  } catch {
    return false;
  }
}

export interface SendInput {
  recipient: string;
  amount: string;
}

export interface SendValidation {
  ok: boolean;
  errors: { recipient?: string; amount?: string };
  /** Parsed values, present when ok. */
  value?: { recipient: string; lamports: number; sol: number };
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,9})?$/;

/**
 * Validates the Send form. Amounts are parsed from text (no float surprises from <input
 * type=number>), capped at 9 decimals (1 lamport), and must leave room for the network fee.
 */
export function validateSend(
  input: SendInput,
  ctx: { from: string | null; balanceSol: number | null },
): SendValidation {
  const errors: SendValidation["errors"] = {};
  const recipient = input.recipient.trim();
  const amountText = input.amount.trim().replace(",", ".");

  if (!recipient) errors.recipient = "Enter a recipient address.";
  else if (!isValidAddress(recipient)) errors.recipient = "That isn't a valid Solana address.";
  else if (ctx.from && recipient === ctx.from) errors.recipient = "You can't send to yourself.";

  let lamports = 0;
  if (!amountText) errors.amount = "Enter an amount.";
  else if (!AMOUNT_PATTERN.test(amountText))
    errors.amount = "Use a number with up to 9 decimals, like 0.5.";
  else {
    lamports = solToLamports(Number(amountText));
    if (lamports <= 0) errors.amount = "Amount must be greater than 0.";
    else if (ctx.balanceSol != null) {
      const available = solToLamports(ctx.balanceSol) - BASE_FEE_LAMPORTS;
      if (lamports > available)
        errors.amount = `Not enough test SOL. Max is ${lamportsToSol(Math.max(0, available))} SOL after the fee.`;
    }
  }

  const ok = Object.keys(errors).length === 0;
  return ok
    ? { ok, errors, value: { recipient, lamports, sol: lamportsToSol(lamports) } }
    : { ok, errors };
}

/** Maps RPC / wallet errors to something a person can act on. */
export function friendlyError(error: unknown, action: "airdrop" | "send" | "sign"): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const text = raw.toLowerCase();
  if (/user rejected|rejected the request|declined|cancel/.test(text))
    return "You cancelled the request in your wallet.";
  if (action === "airdrop") {
    if (/faucet.*closed|410/.test(text))
      return "The devnet RPC faucet is closed right now. Get free test SOL at faucet.solana.com instead.";
    if (/429|rate|limit|too many|dry/.test(text))
      return "The devnet faucet is rate-limited. Wait a bit, or use faucet.solana.com.";
    return "The airdrop didn't go through. Devnet faucets are flaky; try faucet.solana.com.";
  }
  if (/insufficient|0x1\b|debit an account/.test(text))
    return "Not enough test SOL to cover the amount and the fee.";
  if (/blockhash|expired|timeout|timed out/.test(text))
    return "The network took too long to confirm. Check the explorer before retrying.";
  if (action === "sign" && /not support|signmessage/.test(text))
    return "This wallet doesn't support message signing.";
  return action === "send" ? "The transfer failed. Nothing was sent." : "Signing failed.";
}
