import type { ActivityItem } from "@/lib/solana/types";

/**
 * Per-address local record of things the RPC can't tell us: signed messages (never on chain)
 * and which signatures were airdrops requested from this app.
 */
export interface LocalLog {
  signed: ActivityItem[];
  airdrops: string[];
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const MAX_ITEMS = 50;
const key = (address: string) => `organizadapp:v1:${address}`;

function storage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readLog(address: string, store = storage()): LocalLog {
  const empty: LocalLog = { signed: [], airdrops: [] };
  if (!store) return empty;
  try {
    const parsed = JSON.parse(store.getItem(key(address)) ?? "null") as Partial<LocalLog> | null;
    return {
      signed: Array.isArray(parsed?.signed) ? parsed.signed : [],
      airdrops: Array.isArray(parsed?.airdrops)
        ? parsed.airdrops.filter((s) => typeof s === "string")
        : [],
    };
  } catch {
    return empty;
  }
}

export function updateLog(
  address: string,
  update: (log: LocalLog) => LocalLog,
  store = storage(),
): LocalLog {
  const next = update(readLog(address, store));
  const trimmed = {
    signed: next.signed.slice(0, MAX_ITEMS),
    airdrops: next.airdrops.slice(0, MAX_ITEMS),
  };
  try {
    store?.setItem(key(address), JSON.stringify(trimmed));
  } catch {
    // Storage full or disabled: the log is a nice-to-have, never block the action.
  }
  return trimmed;
}
