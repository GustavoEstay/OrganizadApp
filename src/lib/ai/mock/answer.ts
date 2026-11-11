import type { WalletContext } from "@/lib/ai/context";
import { formatSol, truncateAddress } from "@/lib/solana/format";
import { ACTIVITY_LABELS } from "@/lib/solana/types";
import { explainActivity } from "./explain";

export const HELP_TEXT = [
  "I can explain your devnet wallet activity in plain language.",
  "- Click any row in **Recent activity** and I'll break it down: amount, counterparty, fee and status.",
  '- Or ask things like "What\'s my balance?", "How do fees work?" or "Is this real money?".',
].join("\n");

type Intent =
  | "explain-selected"
  | "explain-latest"
  | "balance"
  | "fees"
  | "real-money"
  | "airdrop"
  | "signing"
  | "summary"
  | "safety"
  | "greeting"
  | "help";

const RULES: [Intent, RegExp][] = [
  ["safety", /seed|private key|recovery phrase|secret/],
  [
    "explain-latest",
    /\b(latest|last|most recent|newest)\b.*\b(transaction|tx|activity|transfer)\b/,
  ],
  [
    "explain-selected",
    /\b(this|that|selected)\b.*\b(transaction|tx|one|transfer|payment)\b|what was this|explain (it|this)/,
  ],
  ["balance", /\bbalance\b|how much (sol|do i have)/],
  ["fees", /\bfees?\b|gas|lamport/],
  ["real-money", /real money|\breal\b|worth|value|mainnet|devnet/],
  ["airdrop", /airdrop|faucet|free sol|test sol/],
  ["signing", /sign(ed|ing)? (a )?message|signature|verify/],
  ["summary", /summar|recent|history|activity|what happened/],
  ["greeting", /^(hi|hello|hey|hola)\b/],
];

export function detectIntent(question: string, ctx: WalletContext): Intent {
  const q = question.toLowerCase().trim();
  for (const [intent, pattern] of RULES) if (pattern.test(q)) return intent;
  // A bare question right after clicking a row is almost always about that row.
  if (ctx.selected && /\?|explain|what|why|who/.test(q)) return "explain-selected";
  return "help";
}

function summarize(ctx: WalletContext): string {
  const items = ctx.recent.slice(0, 5);
  if (items.length === 0)
    return "There's no activity yet. Try an **Airdrop** to get some test SOL.";
  const lines = items.map((i) => {
    const amount = i.amountSol != null ? ` ${formatSol(i.amountSol)}` : "";
    const who =
      i.counterparty && (i.type === "sent" || i.type === "received")
        ? ` ${i.type === "sent" ? "to" : "from"} ${truncateAddress(i.counterparty)}`
        : "";
    return `- ${ACTIVITY_LABELS[i.type]}${amount}${who}${i.status === "failed" ? " (failed)" : ""}`;
  });
  return [`Your last ${items.length} activities:`, lines.join("\n")].join("\n\n");
}

/** The deterministic copilot brain: question + wallet context in, plain-language answer out. */
export function answerQuestion(question: string, ctx: WalletContext): string {
  const intent = detectIntent(question, ctx);
  switch (intent) {
    case "explain-selected":
      if (ctx.selected) return explainActivity(ctx.selected, ctx.address);
      if (ctx.recent[0]) return explainActivity(ctx.recent[0], ctx.address);
      return "Pick a row in **Recent activity** and I'll explain it.";
    case "explain-latest":
      return ctx.recent[0]
        ? explainActivity(ctx.recent[0], ctx.address)
        : "There's no activity yet. Try an **Airdrop** to get some test SOL.";
    case "balance":
      if (ctx.balanceSol == null)
        return "Connect Phantom or turn on **Try demo** and I'll tell you your balance.";
      return [
        `Your balance is **${formatSol(ctx.balanceSol)}** on devnet${ctx.mode === "demo" ? " (demo wallet)" : ""}.`,
        "- It's test SOL, so it has no real value.",
        "- Sending needs a tiny bit extra for the fee (0.000005 SOL per signature).",
      ].join("\n");
    case "fees":
      return [
        "Solana fees are tiny and predictable: **0.000005 SOL per signature** (5,000 lamports).",
        "- The fee payer is usually whoever sends the transaction.",
        "- A failed transaction still pays the fee, because validators did the work.",
        "- Busy apps can add an optional priority fee to get in faster.",
      ].join("\n");
    case "real-money":
      return [
        "**No.** OrganizadApp only talks to Solana **devnet**, a test network.",
        "- Devnet SOL is free from faucets and has no value.",
        "- The app is hard-coded to devnet, so it can't touch mainnet funds.",
      ].join("\n");
    case "airdrop":
      return [
        "An **airdrop** gives you free devnet SOL for testing.",
        "- The button asks the devnet faucet for 1 SOL.",
        "- Faucets are rate-limited. If it fails, wait a bit or use faucet.solana.com.",
      ].join("\n");
    case "signing":
      return [
        "**Signing a message** proves you own a wallet without sending a transaction.",
        "- Phantom signs the text with your private key; the app checks it with your public key (ed25519).",
        "- It's free and moves no funds. Only sign messages you understand.",
      ].join("\n");
    case "summary":
      return summarize(ctx);
    case "safety":
      return "**Never share your seed phrase or private key** with anyone, me included. No real app or support team will ask for it. I only see your public address and activity.";
    case "greeting":
      return `Hi! ${HELP_TEXT}`;
    case "help":
      return HELP_TEXT;
  }
}
