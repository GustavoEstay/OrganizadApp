"use client";

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PhantomWalletName } from "@solana/wallet-adapter-phantom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityList } from "@/components/activity/activity-list";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { LogoMark, StatusRegion } from "@/components/ui";
import { BalanceCard } from "@/components/wallet/balance-card";
import { DemoToggle } from "@/components/wallet/demo-toggle";
import { DevnetBadge } from "@/components/wallet/devnet-badge";
import { PhantomButton, type PhantomButtonState } from "@/components/wallet/phantom-button";
import { SendForm } from "@/components/wallet/send-form";
import { SignMessageCard } from "@/components/wallet/sign-message-card";
import { SignatureLink } from "@/components/wallet/signature-link";
import type { WalletContext } from "@/lib/ai/context";
import { DEVNET_FAUCET_URL } from "@/lib/solana/cluster";
import type { ActivityItem } from "@/lib/solana/types";
import { friendlyError } from "@/lib/solana/validation";
import { createDemoSource } from "@/lib/wallet/demo-source";
import {
  useActivity,
  useAirdrop,
  useBalance,
  useClusterGuard,
  useSend,
  useSignMessage,
} from "@/lib/wallet/hooks";
import { createLiveSource } from "@/lib/wallet/live-source";
import { defaultSignText } from "@/lib/wallet/sign";
import { toContextItem, useCopilot } from "@/lib/wallet/use-copilot";

export function Dashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [demoChoice, setDemoChoice] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [sendOpen, setSendOpen] = useState(false);

  const phantom = wallet.wallets.find((w) => w.adapter.name === PhantomWalletName);
  const phantomInstalled =
    phantom?.readyState === WalletReadyState.Installed ||
    phantom?.readyState === WalletReadyState.Loadable;
  // Visitors without Phantom land in demo mode; the toggle always wins once touched.
  const demo = demoChoice ?? (!wallet.connected && !phantomInstalled);

  const demoSource = useMemo(() => createDemoSource(), []);
  const { publicKey, sendTransaction, signMessage, connected } = wallet;
  const liveSource = useMemo(
    () =>
      connected && publicKey
        ? createLiveSource(connection, { publicKey, sendTransaction, signMessage })
        : null,
    [connected, publicKey, connection, sendTransaction, signMessage],
  );
  const source = demo ? demoSource : liveSource;

  const guard = useClusterGuard(!demo && Boolean(liveSource));
  const clusterOk = demo || guard.data !== false;

  const balance = useBalance(source);
  const activity = useActivity(source);
  const airdrop = useAirdrop(source);
  const send = useSend(source);
  const sign = useSignMessage(source);

  const getContext = useCallback(
    (sel: ActivityItem | null): WalletContext => ({
      mode: source ? source.mode : "disconnected",
      address: source?.address ?? null,
      balanceSol: balance.data ?? null,
      recent: (activity.data ?? []).slice(0, 10).map(toContextItem),
      selected: sel ? toContextItem(sel) : null,
    }),
    [source, balance.data, activity.data],
  );
  const copilot = useCopilot(getContext);
  const { setMessages, stop: stopChat } = copilot;

  // A different wallet means a different conversation.
  const sourceKey = source ? `${source.mode}:${source.address}` : "none";
  useEffect(() => {
    setSelected(null);
    setSendOpen(false);
    void stopChat();
    setMessages([]);
    airdrop.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the wallet changes
  }, [sourceKey]);

  const connect = () => {
    setDemoChoice(false);
    if (wallet.wallet?.adapter.name !== PhantomWalletName)
      wallet.select(PhantomWalletName); // autoConnect takes over
    else void wallet.connect().catch(() => undefined);
  };

  const onSelect = (item: ActivityItem) => {
    setSelected(item);
    void copilot.ask("What was this transaction?", item);
    // On stacked (mobile) layouts the copilot is below the list: bring the answer into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.getElementById("copilot")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const buttonState: PhantomButtonState = demo
    ? "demo"
    : wallet.connected
      ? "connected"
      : wallet.connecting
        ? "connecting"
        : phantomInstalled
          ? "disconnected"
          : "not-installed";

  const placeholder = source ? undefined : (
    <>
      {phantomInstalled
        ? "Connect Phantom (set to Devnet) to see your test wallet."
        : "Phantom isn't installed in this browser."}{" "}
      Or turn on <strong>Try demo</strong> to explore with sample data.
    </>
  );

  const airdropStatus = airdrop.isPending ? (
    "Requesting 1 SOL from the devnet faucet…"
  ) : airdrop.isSuccess ? (
    <>
      +1 SOL airdropped. <SignatureLink signature={airdrop.data.signature} demo={demo} />
    </>
  ) : airdrop.isError ? (
    <>
      {friendlyError(airdrop.error, "airdrop")}{" "}
      <a
        href={DEVNET_FAUCET_URL}
        target="_blank"
        rel="noreferrer"
        className="font-medium underline"
      >
        Open faucet
      </a>
    </>
  ) : null;

  const errorText = (e: unknown) => (e ? "Couldn't reach devnet. Try again in a moment." : null);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1240px] flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LogoMark className="size-11" />
          <span className="text-[2.1rem] font-bold tracking-tight">OrganizadApp</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <DemoToggle checked={demo} onChange={setDemoChoice} />
          <DevnetBadge />
          <PhantomButton
            state={buttonState}
            address={demo ? demoSource.address : wallet.publicKey?.toBase58()}
            onConnect={connect}
            onDisconnect={() => void wallet.disconnect()}
          />
        </div>
      </header>

      {demo && (
        <p className="mt-4 text-sm text-ink-500" data-testid="demo-note">
          You&apos;re exploring a <strong className="font-medium text-ink-700">demo wallet</strong>{" "}
          with sample devnet data. Nothing here touches real money.
        </p>
      )}
      {!clusterOk && (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200"
        >
          The RPC endpoint didn&apos;t report Solana devnet, so sending and airdrops are disabled.
        </p>
      )}

      <main className="mt-8 grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
        <h1 className="sr-only">OrganizadApp devnet wallet</h1>
        <div className="flex flex-col gap-6 lg:pt-[52px]">
          <BalanceCard
            balanceSol={source ? balance.data : null}
            loading={Boolean(source) && balance.isPending}
            error={errorText(balance.error)}
            onAirdrop={() => airdrop.mutate()}
            airdropPending={airdrop.isPending}
            sendOpen={sendOpen}
            onToggleSend={() => setSendOpen((v) => !v)}
            disabled={!source || !clusterOk}
          >
            <StatusRegion
              className={airdropStatus ? "mt-4" : undefined}
              testId="airdrop-status"
              tone={airdrop.isError ? "error" : airdrop.isSuccess ? "success" : "info"}
            >
              {airdropStatus}
            </StatusRegion>
            {sendOpen && source && (
              <SendForm
                from={source.address}
                balanceSol={balance.data ?? null}
                demo={demo}
                onSend={(recipient, lamports) => send.mutateAsync({ recipient, lamports })}
                onCancel={() => setSendOpen(false)}
              />
            )}
          </BalanceCard>
          {source && (
            <SignMessageCard
              key={sourceKey}
              defaultText={defaultSignText(source.address)}
              canSign={source.canSignMessage}
              disabled={!clusterOk}
              onSign={(text) => sign.mutateAsync(text)}
            />
          )}
        </div>

        <ActivityList
          items={activity.data}
          loading={Boolean(source) && activity.isPending}
          error={errorText(activity.error)}
          onRetry={() => void activity.refetch()}
          refreshing={activity.isFetching}
          selectedId={selected?.id}
          onSelect={onSelect}
          placeholder={placeholder}
        />

        <div className="lg:sticky lg:top-6 lg:pt-[52px]">
          <CopilotPanel
            messages={copilot.messages}
            status={copilot.status}
            error={copilot.error}
            provider={copilot.provider}
            selected={selected}
            onSend={(text) => void copilot.ask(text, selected)}
            onStop={() => void copilot.stop()}
            onClear={() => {
              setMessages([]);
              setSelected(null);
            }}
            onClearSelection={() => setSelected(null)}
          />
        </div>
      </main>

      <footer className="mt-10 border-t border-cream-300/70 pt-5 text-xs text-ink-500">
        Solana devnet only · test funds, no real money · Portfolio prototype, not affiliated with
        Phantom.
      </footer>
    </div>
  );
}
