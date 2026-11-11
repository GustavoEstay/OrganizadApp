import { Badge } from "@/components/ui";

export function DevnetBadge() {
  return (
    <Badge
      tone="honey"
      size="lg"
      dot
      title="Solana devnet: test network, no real money"
      data-testid="devnet-badge"
    >
      Devnet
    </Badge>
  );
}
