/**
 * OrganizadApp is a devnet-only prototype. The cluster is hard-coded on purpose: there is no
 * env var or UI switch that can point it at mainnet-beta.
 */
export const CLUSTER = "devnet" as const;
export const RPC_ENDPOINT = "https://api.devnet.solana.com";
/** Genesis hash of Solana devnet. Checked at runtime before any write action is enabled. */
export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const DEVNET_FAUCET_URL = "https://faucet.solana.com";

export function assertDevnetEndpoint(endpoint: string): string {
  const url = new URL(endpoint);
  if (!/devnet/i.test(url.hostname) || /mainnet/i.test(url.hostname)) {
    throw new Error(`Refusing to use a non-devnet RPC endpoint: ${url.hostname}`);
  }
  return endpoint;
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=${CLUSTER}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${encodeURIComponent(address)}?cluster=${CLUSTER}`;
}
