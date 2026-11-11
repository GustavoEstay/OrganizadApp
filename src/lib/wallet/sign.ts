import bs58 from "bs58";
import nacl from "tweetnacl";

export function encodeMessage(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** ed25519 verification of a wallet signature against the signer's public key. */
export function verifySignature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  if (signature.length !== nacl.sign.signatureLength || publicKey.length !== 32) return false;
  return nacl.sign.detached.verify(message, signature, publicKey);
}

export function defaultSignText(address: string, now: Date = new Date()): string {
  return `OrganizadApp: I control ${address.slice(0, 8)}… (${now.toISOString().slice(0, 10)})`;
}

export const toBase58 = (bytes: Uint8Array) => bs58.encode(bytes);
export const fromBase58 = (text: string) => bs58.decode(text);
