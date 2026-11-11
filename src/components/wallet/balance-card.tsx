import type { ReactNode } from "react";
import { Button, Card, Skeleton } from "@/components/ui";
import { formatSol } from "@/lib/solana/format";

export interface BalanceCardProps {
  balanceSol: number | null | undefined;
  loading?: boolean;
  error?: string | null;
  onAirdrop: () => void;
  airdropPending?: boolean;
  sendOpen: boolean;
  onToggleSend: () => void;
  /** Disables write actions (e.g. cluster check failed). */
  disabled?: boolean;
  /** Status region and the Send form render here. */
  children?: ReactNode;
}

export function BalanceCard({
  balanceSol,
  loading,
  error,
  onAirdrop,
  airdropPending,
  sendOpen,
  onToggleSend,
  disabled,
  children,
}: BalanceCardProps) {
  return (
    <Card aria-labelledby="balance-heading" className="p-6">
      <h2 id="balance-heading" className="text-lg font-medium text-ink-900">
        Balance
      </h2>
      <div className="mt-1 min-h-12" data-testid="balance">
        {loading ? (
          <Skeleton className="h-11 w-44" />
        ) : error ? (
          <p className="text-sm text-rose-700">{error}</p>
        ) : (
          <p className="text-[2.6rem] leading-tight font-bold tracking-tight tabular-nums">
            {balanceSol != null ? formatSol(balanceSol) : "—"}
          </p>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-500">≈ test funds, no real money</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button size="lg" onClick={onAirdrop} loading={airdropPending} disabled={disabled}>
          Airdrop
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={onToggleSend}
          aria-expanded={sendOpen}
          aria-controls="send-form"
          disabled={disabled}
        >
          Send
        </Button>
      </div>
      {children}
    </Card>
  );
}
