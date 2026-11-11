"use client";

import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo } from "react";
import type { WalletContext } from "@/lib/ai/context";
import type { ActivityItem } from "@/lib/solana/types";
import type { ProviderInfo } from "@/components/copilot/copilot-panel";

/** Trims an activity row to what the copilot schema accepts. */
export function toContextItem(item: ActivityItem): WalletContext["recent"][number] {
  return {
    ...item,
    id: item.id.slice(0, 128),
    amountSol: item.amountSol != null ? Math.abs(item.amountSol) : null,
    error: item.error ? item.error.slice(0, 300) : null,
    message: item.message?.slice(0, 500),
  };
}

export function useCopilot(getContext: (selected: ActivityItem | null) => WalletContext) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const chat = useChat({ transport });

  const provider = useQuery({
    queryKey: ["copilot-provider"],
    queryFn: async () => (await (await fetch("/api/chat")).json()) as ProviderInfo,
    staleTime: Infinity,
  });

  const { sendMessage, stop, status, clearError } = chat;
  const ask = useCallback(
    async (text: string, selected: ActivityItem | null) => {
      if (status === "submitted" || status === "streaming") await stop();
      clearError();
      await sendMessage({ text }, { body: { context: getContext(selected) } });
    },
    [sendMessage, stop, status, clearError, getContext],
  );

  return { ...chat, ask, provider: provider.data ?? null };
}
