"use client";

import type { UIMessage } from "ai";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpIcon,
  Badge,
  Card,
  ChatIcon,
  DotsIcon,
  ExternalIcon,
  SparkleIcon,
} from "@/components/ui";
import { SUGGESTIONS } from "@/lib/ai/suggestions";
import { explorerTxUrl } from "@/lib/solana/cluster";
import { formatSol } from "@/lib/solana/format";
import { ACTIVITY_LABELS, type ActivityItem } from "@/lib/solana/types";
import { cn } from "@/lib/utils/cn";
import { MarkdownLite } from "./markdown-lite";

export const MAX_INPUT = 1_000;

export interface ProviderInfo {
  id: "mock" | "gemini";
  modelId: string;
}

export interface CopilotPanelProps {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error?: Error | null;
  provider?: ProviderInfo | null;
  selected?: ActivityItem | null;
  onSend: (text: string) => void;
  onStop?: () => void;
  onClear?: () => void;
  onClearSelection?: () => void;
  className?: string;
}

function messageText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function SelectedChip({ item, onClear }: { item: ActivityItem; onClear?: () => void }) {
  const amount = item.amountSol != null ? ` ${formatSol(item.amountSol)}` : "";
  const onChain = !item.demo && item.type !== "signed-message";
  return (
    <div
      className="flex items-center gap-2 rounded-2xl bg-honey-50 px-3 py-2 text-xs text-ink-700 ring-1 ring-honey-100"
      data-testid="copilot-selected"
    >
      <span className="min-w-0 flex-1 truncate">
        About:{" "}
        <strong className="font-semibold">
          {ACTIVITY_LABELS[item.type]}
          {amount}
        </strong>
      </span>
      {onChain && (
        <a
          href={explorerTxUrl(item.id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
        >
          Explorer <ExternalIcon className="size-3" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-full px-1.5 text-base leading-none text-ink-500 hover:text-ink-900"
          aria-label="Clear selected transaction"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function CopilotPanel({
  messages,
  status,
  error,
  provider,
  selected,
  onSend,
  onStop,
  onClear,
  onClearSelection,
  className,
}: CopilotPanelProps) {
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = listRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    onSend(text.slice(0, MAX_INPUT));
    setInput("");
  };

  return (
    <Card
      id="copilot"
      aria-label="AI copilot"
      className={cn(
        "flex min-h-[520px] flex-col overflow-hidden lg:h-[min(640px,calc(100dvh-15rem))] lg:min-h-[480px]",
        className,
      )}
      data-testid="copilot"
    >
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-cream-200 px-5">
        <div className="flex items-center gap-2.5">
          <ChatIcon className="size-6 text-ink-900" />
          <h2 className="text-xl font-semibold">Copilot</h2>
          {provider && (
            <Badge tone={provider.id === "mock" ? "neutral" : "pine"} title={provider.modelId}>
              {provider.id === "mock" ? "Mock AI" : "Gemini"}
            </Badge>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Copilot options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-9 items-center justify-center rounded-full text-ink-700 hover:bg-cream-100"
          >
            <DotsIcon className="size-5" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-10 mt-1 w-40 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-cream-300"
            >
              <button
                role="menuitem"
                type="button"
                disabled={busy}
                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cream-100 disabled:opacity-50"
                onClick={() => {
                  setMenuOpen(false);
                  onClear?.();
                }}
              >
                New chat
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {selected && (
          <div className="mb-4">
            <SelectedChip item={selected} onClear={onClearSelection} />
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-ink-700">
              I explain your wallet activity in plain words. Select a transaction, or try:
            </p>
            <ul className="flex flex-col gap-2" aria-label="Suggested questions">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => onSend(s)}
                    disabled={busy}
                    className="w-full rounded-2xl bg-cream-50 px-3 py-2 text-left text-sm text-ink-700 ring-1 ring-cream-200 transition-colors hover:bg-honey-50 hover:ring-honey-100"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="flex flex-col gap-4"
          >
            {messages.map((m) => {
              const text = messageText(m);
              if (!text) return null;
              const isUser = m.role === "user";
              return (
                <li
                  key={m.id}
                  data-testid={`message-${m.role}`}
                  className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
                >
                  <span className="sr-only">{isUser ? "You said:" : "Copilot said:"}</span>
                  {!isUser && (
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-cream-100 ring-1 ring-cream-300"
                    >
                      <SparkleIcon className="size-5 text-pine-700" />
                    </span>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      isUser
                        ? "max-w-[85%] bg-pine-700 text-white"
                        : "max-w-[88%] bg-[#efe6d6] text-ink-900",
                    )}
                  >
                    {isUser ? text : <MarkdownLite text={text} />}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {status === "submitted" && (
          <p className="mt-3 text-xs text-ink-500" role="status">
            Thinking…
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="mt-3 rounded-2xl bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200"
          >
            {error.message.includes("429") || /too many/i.test(error.message)
              ? "You're sending messages too fast. Wait a few seconds and try again."
              : "Something went wrong talking to the copilot."}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="shrink-0 p-4">
        <label htmlFor="copilot-input" className="sr-only">
          Message the copilot
        </label>
        <div className="flex items-center gap-2 rounded-2xl bg-white px-2 ring-1 ring-cream-300 focus-within:ring-2 focus-within:ring-pine-600">
          <input
            id="copilot-input"
            value={input}
            maxLength={MAX_INPUT}
            autoComplete="off"
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your wallet"
            className="h-12 min-w-0 flex-1 bg-transparent px-2 text-[15px] placeholder:text-ink-400 focus:outline-none"
          />
          {busy && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className="h-8 rounded-full px-3 text-xs font-medium text-ink-700 ring-1 ring-cream-300 hover:bg-cream-100"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim()}
              className="flex size-9 items-center justify-center rounded-full bg-pine-700 text-white transition-opacity hover:bg-pine-600 disabled:opacity-30"
            >
              <ArrowUpIcon className="size-4.5" />
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
