import { ExternalIcon } from "@/components/ui";
import { explorerTxUrl } from "@/lib/solana/cluster";
import { truncateAddress } from "@/lib/solana/format";

/** Signature with a devnet Solana Explorer link (or a demo note: demo signatures aren't on chain). */
export function SignatureLink({ signature, demo }: { signature: string; demo?: boolean }) {
  const short = truncateAddress(signature, 6);
  if (demo) {
    return (
      <span>
        Signature <code className="font-mono">{short}</code> (demo, not on chain)
      </span>
    );
  }
  return (
    <a
      href={explorerTxUrl(signature)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
    >
      <code className="font-mono">{short}</code> on Solana Explorer (devnet)
      <ExternalIcon className="size-3.5" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
