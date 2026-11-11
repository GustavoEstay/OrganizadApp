import {
  PublicKey,
  SystemProgram,
  Transaction,
  type Connection,
  type SendOptions,
} from "@solana/web3.js";
import { parseTransaction, sortActivity } from "@/lib/solana/parse";
import type { ActivityItem } from "@/lib/solana/types";
import { lamportsToSol } from "@/lib/solana/format";
import { AIRDROP_SOL, LAMPORTS_PER_SOL } from "@/lib/solana/units";
import { readLog, updateLog } from "./local-log";
import { encodeMessage, toBase58, verifySignature } from "./sign";
import type { WalletSource } from "./source";

export interface LiveWallet {
  publicKey: PublicKey;
  sendTransaction: (
    tx: Transaction,
    connection: Connection,
    options?: SendOptions & { minContextSlot?: number },
  ) => Promise<string>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

const ACTIVITY_LIMIT = 12;

async function confirm(connection: Connection, signature: string) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const res = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (res.value.err) throw new Error(`Transaction failed: ${JSON.stringify(res.value.err)}`);
}

/** Devnet-backed wallet: reads through the RPC, writes through the connected Phantom wallet. */
export function createLiveSource(connection: Connection, wallet: LiveWallet): WalletSource {
  const owner = wallet.publicKey.toBase58();

  return {
    mode: "live",
    address: owner,
    canSignMessage: typeof wallet.signMessage === "function",

    async getBalance() {
      return lamportsToSol(await connection.getBalance(wallet.publicKey, "confirmed"));
    },

    async getActivity() {
      const sigs = await connection.getSignaturesForAddress(wallet.publicKey, {
        limit: ACTIVITY_LIMIT,
      });
      const txs = sigs.length
        ? await connection.getParsedTransactions(
            sigs.map((s) => s.signature),
            { maxSupportedTransactionVersion: 0, commitment: "confirmed" },
          )
        : [];
      const log = readLog(owner);
      const airdropSignatures = new Set(log.airdrops);
      const onChain = txs.flatMap((tx, i): ActivityItem[] =>
        tx
          ? [
              parseTransaction(tx, {
                owner,
                airdropSignatures,
                confirmationStatus: sigs[i]?.confirmationStatus ?? null,
              }),
            ]
          : [],
      );
      return sortActivity([...onChain, ...log.signed]).slice(0, ACTIVITY_LIMIT + 8);
    },

    async requestAirdrop() {
      const signature = await connection.requestAirdrop(
        wallet.publicKey,
        AIRDROP_SOL * LAMPORTS_PER_SOL,
      );
      updateLog(owner, (log) => ({ ...log, airdrops: [signature, ...log.airdrops] }));
      await confirm(connection, signature);
      return { signature };
    },

    async send(recipient, lamports) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(recipient),
          lamports,
        }),
      );
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext("confirmed");
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = blockhash;
      const signature = await wallet.sendTransaction(tx, connection, { minContextSlot });
      const res = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      );
      if (res.value.err) throw new Error(`Transaction failed: ${JSON.stringify(res.value.err)}`);
      return { signature };
    },

    async signMessage(text) {
      if (!wallet.signMessage) throw new Error("This wallet does not support signMessage");
      const message = encodeMessage(text);
      const signature = await wallet.signMessage(message);
      const verified = verifySignature(message, signature, wallet.publicKey.toBytes());
      const encoded = toBase58(signature);
      const item: ActivityItem = {
        id: `local-${encoded.slice(0, 16)}`,
        type: "signed-message",
        amountSol: null,
        counterparty: null,
        feeSol: null,
        feePayer: null,
        status: "local",
        timestamp: Date.now(),
        message: text,
      };
      if (verified) updateLog(owner, (log) => ({ ...log, signed: [item, ...log.signed] }));
      return { signature: encoded, verified, item };
    },
  };
}
