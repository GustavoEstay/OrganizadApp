"use client";

import { useId, useState } from "react";
import { Button, Card, CheckIcon, StatusRegion } from "@/components/ui";
import { truncateAddress } from "@/lib/solana/format";
import { friendlyError } from "@/lib/solana/validation";
import type { SignResult } from "@/lib/wallet/source";

export interface SignMessageCardProps {
  defaultText: string;
  canSign: boolean;
  disabled?: boolean;
  onSign: (text: string) => Promise<SignResult>;
}

/** Prove wallet ownership: signMessage + local ed25519 verification (tweetnacl). */
export function SignMessageCard({ defaultText, canSign, disabled, onSign }: SignMessageCardProps) {
  const id = useId();
  const [text, setText] = useState(defaultText);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const sign = async () => {
    setPending(true);
    setResult(null);
    try {
      const res = await onSign(text.trim() || defaultText);
      setResult(
        res.verified
          ? {
              ok: true,
              text: `Signature ${truncateAddress(res.signature, 6)} verified with your public key.`,
            }
          : { ok: false, text: "The wallet returned a signature that didn't verify." },
      );
    } catch (err) {
      setResult({ ok: false, text: friendlyError(err, "sign") });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card aria-labelledby={`${id}-title`} className="p-6">
      <h2 id={`${id}-title`} className="text-base font-medium">
        Prove it&apos;s you
      </h2>
      <p className="mt-1 text-sm text-ink-500">
        Sign a message. Free, no transaction, no funds move.
      </p>
      <label htmlFor={`${id}-msg`} className="mt-4 block text-xs font-medium text-ink-700">
        Message to sign
      </label>
      <textarea
        id={`${id}-msg`}
        rows={2}
        maxLength={300}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-1 w-full resize-none rounded-xl bg-cream-50 px-3 py-2 text-sm ring-1 ring-cream-300 ring-inset focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:outline-none"
      />
      <Button
        variant="outline"
        className="mt-3 w-full"
        onClick={() => void sign()}
        loading={pending}
        disabled={disabled || !canSign}
      >
        Sign message
      </Button>
      {!canSign && (
        <p className="mt-2 text-xs text-ink-500">
          This wallet doesn&apos;t support message signing.
        </p>
      )}
      <StatusRegion
        className={result ? "mt-3" : undefined}
        testId="sign-status"
        tone={result ? (result.ok ? "success" : "error") : "info"}
      >
        {result && (
          <span className="inline-flex items-start gap-1.5">
            {result.ok && <CheckIcon className="mt-0.5 size-3.5 shrink-0" />}
            {result.text}
          </span>
        )}
      </StatusRegion>
    </Card>
  );
}
