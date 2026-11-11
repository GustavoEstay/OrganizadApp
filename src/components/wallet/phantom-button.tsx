"use client";

import { useEffect, useRef, useState } from "react";
import { GhostIcon } from "@/components/ui";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { truncateAddress } from "@/lib/solana/format";
import { cn } from "@/lib/utils/cn";

export type PhantomButtonState =
  "connected" | "connecting" | "disconnected" | "not-installed" | "demo";

export interface PhantomButtonProps {
  state: PhantomButtonState;
  address?: string | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const base =
  "inline-flex h-14 items-center gap-3 rounded-2xl bg-phantom-500 pr-5 pl-3 text-left text-white shadow-[0_8px_20px_-10px_rgba(88,71,207,0.8)] transition-colors hover:bg-phantom-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phantom-600";

function Label({ top, bottom }: { top: string; bottom?: string }) {
  return (
    <span className="flex flex-col leading-tight">
      <span className={cn(bottom ? "text-xs font-medium text-white/85" : "text-sm font-semibold")}>
        {top}
      </span>
      {bottom && (
        <span className="font-mono text-[15px] font-semibold tracking-tight">{bottom}</span>
      )}
    </span>
  );
}

/** Purple Phantom-style wallet button. Connected state opens a small menu (copy, explorer, disconnect). */
export function PhantomButton({ state, address, onConnect, onDisconnect }: PhantomButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (state === "not-installed") {
    return (
      <a href="https://phantom.com/download" target="_blank" rel="noreferrer" className={base}>
        <GhostIcon className="size-8" />
        <Label top="Install Phantom" bottom="to use a real wallet" />
      </a>
    );
  }

  if (state === "disconnected" || state === "connecting") {
    return (
      <button
        type="button"
        onClick={onConnect}
        disabled={state === "connecting"}
        className={cn(base, "disabled:opacity-80")}
      >
        <GhostIcon className="size-8" />
        <Label top={state === "connecting" ? "Connecting…" : "Connect Phantom"} />
      </button>
    );
  }

  const short = address ? truncateAddress(address) : "";
  const top = state === "demo" ? "Demo wallet" : "Phantom connected";

  if (state === "demo") {
    return (
      <div className={cn(base, "cursor-default hover:bg-phantom-500")} data-testid="wallet-button">
        <GhostIcon className="size-8" />
        <Label top={top} bottom={short} />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={base}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${top}: ${short}. Wallet menu`}
        data-testid="wallet-button"
        onClick={() => setOpen((v) => !v)}
      >
        <GhostIcon className="size-8" />
        <Label top={top} bottom={short} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl bg-white p-1.5 text-sm text-ink-900 shadow-lg ring-1 ring-cream-300"
        >
          <button
            role="menuitem"
            type="button"
            className="w-full rounded-xl px-3 py-2 text-left hover:bg-cream-100 focus-visible:bg-cream-100"
            onClick={() => {
              if (address) void navigator.clipboard?.writeText(address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied!" : "Copy address"}
          </button>
          {address && (
            <a
              role="menuitem"
              href={explorerAddressUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl px-3 py-2 hover:bg-cream-100 focus-visible:bg-cream-100"
            >
              View on Solana Explorer
            </a>
          )}
          <button
            role="menuitem"
            type="button"
            className="w-full rounded-xl px-3 py-2 text-left text-rose-700 hover:bg-rose-50 focus-visible:bg-rose-50"
            onClick={() => {
              setOpen(false);
              onDisconnect?.();
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
