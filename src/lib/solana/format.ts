import { LAMPORTS_PER_SOL } from "./units";

export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  // Round to avoid float artefacts like 0.1 * 1e9 = 100000000.00000001.
  return Math.round(sol * LAMPORTS_PER_SOL);
}

/**
 * Formats a SOL amount for display. Balances and transfers get 2 decimals (more when the
 * amount is tiny, so 0.000005 never shows as 0.00); fees use `fee: true` to keep full precision.
 */
export function formatSol(sol: number, options: { fee?: boolean; sign?: boolean } = {}): string {
  const abs = Math.abs(sol);
  let maxDigits = 2;
  if (options.fee || (abs > 0 && abs < 0.01)) maxDigits = 9;
  const text = abs.toLocaleString("en-US", {
    minimumFractionDigits: options.fee ? 0 : 2,
    maximumFractionDigits: maxDigits,
  });
  const sign = options.sign ? (sol > 0 ? "+" : sol < 0 ? "−" : "") : sol < 0 ? "−" : "";
  return `${sign}${text} SOL`;
}

/** "7xKpQe…3fQa" style truncation used across the UI. */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "just now", "5 minutes ago", "yesterday", "3 days ago". */
export function formatRelativeTime(timestamp: number | null, now: number = Date.now()): string {
  if (timestamp == null) return "Pending";
  const seconds = Math.round((timestamp - now) / 1000);
  if (Math.abs(seconds) < 45) return "just now";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds / 60), "minute");
}

/** Stable absolute date for the copilot, which shouldn't depend on the server's clock. */
export function formatUtcDate(timestamp: number | null): string | null {
  if (timestamp == null) return null;
  const d = new Date(timestamp);
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
