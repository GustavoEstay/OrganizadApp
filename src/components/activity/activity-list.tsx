"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  AirdropIcon,
  Button,
  Card,
  MessageIcon,
  ProgramIcon,
  ReceiveIcon,
  RefreshIcon,
  SentIcon,
  Skeleton,
} from "@/components/ui";
import { formatRelativeTime, formatSol } from "@/lib/solana/format";
import { ACTIVITY_LABELS, type ActivityItem, type ActivityType } from "@/lib/solana/types";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<ActivityType, { Icon: ComponentType<SVGProps<SVGSVGElement>>; tone: string }> =
  {
    received: { Icon: ReceiveIcon, tone: "bg-pine-50 text-pine-700" },
    sent: { Icon: SentIcon, tone: "bg-[#f7e4d6] text-[#9a4f1f]" },
    "signed-message": { Icon: MessageIcon, tone: "bg-[#e3e9e3] text-ink-700" },
    airdrop: { Icon: AirdropIcon, tone: "bg-honey-100 text-honey-700" },
    other: { Icon: ProgramIcon, tone: "bg-cream-200 text-ink-700" },
  };

export interface ActivityListProps {
  items: ActivityItem[] | undefined;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  refreshing?: boolean;
  selectedId?: string | null;
  onSelect?: (item: ActivityItem) => void;
  /** Injected for deterministic stories/tests. */
  now?: number;
  /** Shown instead of the list (e.g. "connect your wallet"). */
  placeholder?: ReactNode;
}

function describe(item: ActivityItem, now: number) {
  const label = ACTIVITY_LABELS[item.type];
  const amount = item.amountSol != null ? `${formatSol(item.amountSol)}` : null;
  const when = formatRelativeTime(item.timestamp, now);
  return { label, amount, when };
}

export function ActivityRow({
  item,
  selected,
  onSelect,
  now,
}: {
  item: ActivityItem;
  selected?: boolean;
  onSelect?: (item: ActivityItem) => void;
  now: number;
}) {
  const { label, amount, when } = describe(item, now);
  const { Icon, tone } = ICONS[item.type];
  const failed = item.status === "failed";
  return (
    <li className="border-b border-cream-200 last:border-b-0">
      <button
        type="button"
        onClick={() => onSelect?.(item)}
        aria-pressed={selected}
        aria-label={`${label}${amount ? ` ${amount}` : ""}${failed ? ", failed" : ""}, ${when}. Select to have the copilot explain it`}
        data-testid="activity-row"
        className={cn(
          "flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-cream-100/70",
          "focus-visible:-outline-offset-2",
          selected && "bg-honey-50 hover:bg-honey-50",
        )}
      >
        <span
          className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", tone)}
        >
          <Icon className="size-6" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[17px] font-medium text-ink-900">{label}</span>
          <span className="text-sm text-ink-500">
            {when}
            {failed && <span className="ml-2 font-medium text-rose-700">Failed</span>}
          </span>
        </span>
        {amount && (
          <span
            className={cn(
              "text-[17px] font-medium tabular-nums",
              failed && "text-ink-400 line-through",
            )}
          >
            {amount}
          </span>
        )}
      </button>
    </li>
  );
}

export function ActivityList({
  items,
  loading,
  error,
  onRetry,
  refreshing,
  selectedId,
  onSelect,
  now = Date.now(),
  placeholder,
}: ActivityListProps) {
  return (
    <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
      <div className="flex h-10 items-center justify-between px-1">
        <h2 id="activity-heading" className="text-xl font-semibold">
          Recent activity
        </h2>
        {onRetry && !placeholder && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRetry}
            aria-label="Refresh activity"
            disabled={refreshing}
          >
            <RefreshIcon className={cn("size-4.5", refreshing && "animate-spin")} />
          </Button>
        )}
      </div>
      <Card className="overflow-hidden rounded-3xl bg-cream-50">
        {placeholder ? (
          <div className="p-6 text-sm text-ink-500">{placeholder}</div>
        ) : loading ? (
          <ul aria-label="Loading activity" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="flex items-center gap-4 border-b border-cream-200 px-5 py-4 last:border-0"
              >
                <Skeleton className="size-12 rounded-full" />
                <span className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </span>
                <Skeleton className="h-4 w-16" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <div role="alert" className="flex flex-col items-start gap-3 p-6 text-sm text-rose-800">
            {error}
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        ) : !items || items.length === 0 ? (
          <p className="p-6 text-sm text-ink-500">
            No activity yet. Press <strong>Airdrop</strong> to get some test SOL.
          </p>
        ) : (
          <ul aria-label="Transactions and signed messages" data-testid="activity-list">
            {items.map((item) => (
              <ActivityRow
                key={item.id}
                item={item}
                now={now}
                selected={item.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </Card>
      {!placeholder && items && items.length > 0 && (
        <p className="px-1 text-xs text-ink-500">Tip: select a row and the copilot explains it.</p>
      )}
    </section>
  );
}
