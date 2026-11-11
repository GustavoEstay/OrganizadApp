"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEVNET_GENESIS_HASH } from "@/lib/solana/cluster";
import type { WalletSource } from "./source";

export const walletKeys = {
  all: (source: WalletSource | null) =>
    ["wallet", source?.mode ?? "none", source?.address ?? ""] as const,
  balance: (source: WalletSource | null) => [...walletKeys.all(source), "balance"] as const,
  activity: (source: WalletSource | null) => [...walletKeys.all(source), "activity"] as const,
};

/** All chain reads go through react-query: cached per mode + address, refetched on demand. */
export function useBalance(source: WalletSource | null) {
  return useQuery({
    queryKey: walletKeys.balance(source),
    queryFn: () => source!.getBalance(),
    enabled: Boolean(source),
    refetchInterval: source?.mode === "live" ? 30_000 : false,
  });
}

export function useActivity(source: WalletSource | null) {
  return useQuery({
    queryKey: walletKeys.activity(source),
    queryFn: () => source!.getActivity(),
    enabled: Boolean(source),
    refetchInterval: source?.mode === "live" ? 60_000 : false,
  });
}

/** Confirms the RPC really is devnet (genesis hash) before live write actions are enabled. */
export function useClusterGuard(enabled: boolean) {
  const { connection } = useConnection();
  return useQuery({
    queryKey: ["cluster-genesis", connection.rpcEndpoint],
    queryFn: async () => (await connection.getGenesisHash()) === DEVNET_GENESIS_HASH,
    enabled,
    staleTime: Infinity,
  });
}

function useInvalidateWallet(source: WalletSource | null) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: walletKeys.all(source) });
    // RPC indexes for getSignaturesForAddress can lag a couple of seconds behind confirmation.
    if (source?.mode === "live") {
      setTimeout(() => void qc.invalidateQueries({ queryKey: walletKeys.all(source) }), 2_500);
    }
  };
}

export function useAirdrop(source: WalletSource | null) {
  const invalidate = useInvalidateWallet(source);
  return useMutation({
    mutationFn: () => source!.requestAirdrop(),
    onSuccess: invalidate,
  });
}

export function useSend(source: WalletSource | null) {
  const invalidate = useInvalidateWallet(source);
  return useMutation({
    mutationFn: (vars: { recipient: string; lamports: number }) =>
      source!.send(vars.recipient, vars.lamports),
    onSuccess: invalidate,
  });
}

export function useSignMessage(source: WalletSource | null) {
  const invalidate = useInvalidateWallet(source);
  return useMutation({
    mutationFn: (text: string) => source!.signMessage(text),
    onSuccess: invalidate,
  });
}
