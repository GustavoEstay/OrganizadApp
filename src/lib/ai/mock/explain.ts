import type { WalletContext } from "@/lib/ai/context";
import { formatSol, formatUtcDate, truncateAddress } from "@/lib/solana/format";
import { ACTIVITY_LABELS, type ActivityItem } from "@/lib/solana/types";

type Activity = WalletContext["recent"][number] | ActivityItem;

const DEVNET_NOTE = "This happened on devnet, so it's test SOL with no real value.";

function party(address: string | null | undefined): string {
  return address ? `**${truncateAddress(address)}**` : "an unknown account";
}

function statusLine(item: Activity): string {
  switch (item.status) {
    case "finalized":
      return "Status: finalized (it can't be reversed).";
    case "confirmed":
      return "Status: confirmed by the network.";
    case "failed":
      return `Status: failed${item.error ? ` (${item.error})` : ""}.`;
    case "local":
      return "Status: done locally in your wallet, nothing went on chain.";
  }
}

function feeLine(item: Activity, owner: string | null): string | null {
  if (item.feeSol == null) return null;
  const payer =
    item.feePayer && owner && item.feePayer === owner
      ? "paid by you"
      : item.feePayer
        ? `paid by ${truncateAddress(item.feePayer)}`
        : "paid by the sender";
  return `Fee: ${formatSol(item.feeSol, { fee: true })}, ${payer}.`;
}

function whenLine(item: Activity): string | null {
  const date = formatUtcDate(item.timestamp);
  return date ? `When: ${date}.` : null;
}

/** Deterministic plain-language explanation of one activity row, built only from its data. */
export function explainActivity(item: Activity, owner: string | null): string {
  const amount = item.amountSol != null ? formatSol(item.amountSol) : null;
  const bullets: (string | null)[] = [];
  let headline: string;

  switch (item.type) {
    case "sent":
      headline = `You **sent ${amount ?? "some SOL"}** to ${party(item.counterparty)}.`;
      bullets.push(feeLine(item, owner));
      if (item.amountSol != null && item.feeSol != null && item.feePayer === owner) {
        bullets.push(
          `Your balance went down by ${formatSol(item.amountSol + item.feeSol, { fee: true })} in total (amount + fee).`,
        );
      }
      break;
    case "received":
      headline = `You **received ${amount ?? "some SOL"}** from ${party(item.counterparty)}.`;
      bullets.push(feeLine(item, owner));
      if (item.feePayer && item.feePayer !== owner) bullets.push("You got the full amount.");
      break;
    case "airdrop":
      headline = `This was a **devnet airdrop of ${amount ?? "test SOL"}**: free test SOL from a faucet, so you can try the app.`;
      bullets.push(feeLine(item, owner));
      break;
    case "signed-message":
      headline = "You **signed a message** with your wallet. It proves you control this address.";
      if (item.message) bullets.push(`Message: "${item.message}".`);
      bullets.push(
        "It is not a transaction: nothing was sent to the network, no fee was paid and no funds moved.",
      );
      bullets.push("The signature was checked in the app with ed25519 and it's valid.");
      break;
    case "other":
      headline = `This transaction **interacted with a program**${amount ? ` and changed your balance by ${amount}` : ""}.`;
      bullets.push(feeLine(item, owner));
      bullets.push("Open it in Solana Explorer to see each instruction.");
      break;
  }

  if (item.status === "failed" && item.type !== "signed-message") {
    headline = `This ${ACTIVITY_LABELS[item.type].toLowerCase()} **failed**, so the ${amount ?? "funds"} didn't move.`;
    bullets.push(
      feeLine(item, owner) ? "The network still charges the fee for a failed transaction." : null,
    );
  }

  bullets.push(statusLine(item), whenLine(item));
  const list = bullets.filter((b): b is string => Boolean(b)).map((b) => `- ${b}`);
  return [headline, list.join("\n"), item.demo ? "This is demo data." : DEVNET_NOTE]
    .filter(Boolean)
    .join("\n\n");
}
