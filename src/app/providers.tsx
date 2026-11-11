"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { assertDevnetEndpoint, RPC_ENDPOINT } from "@/lib/solana/cluster";

const endpoint = assertDevnetEndpoint(RPC_ENDPOINT);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );
  // Phantom registers itself through the Wallet Standard and is detected automatically; the
  // explicit adapter is a fallback for older injected providers (deduplicated by name).
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
        <WalletProvider wallets={wallets} autoConnect localStorageKey="organizadapp:wallet">
          {children}
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
