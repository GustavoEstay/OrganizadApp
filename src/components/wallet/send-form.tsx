"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, StatusRegion } from "@/components/ui";
import { formatSol, lamportsToSol, truncateAddress } from "@/lib/solana/format";
import { BASE_FEE_LAMPORTS } from "@/lib/solana/units";
import { friendlyError, validateSend, type SendValidation } from "@/lib/solana/validation";
import { SignatureLink } from "./signature-link";

export interface SendFormProps {
  from: string | null;
  balanceSol: number | null;
  demo?: boolean;
  onSend: (recipient: string, lamports: number) => Promise<{ signature: string }>;
  onCancel?: () => void;
}

type Step =
  | { kind: "edit" }
  | { kind: "review"; value: NonNullable<SendValidation["value"]> }
  | { kind: "sending"; value: NonNullable<SendValidation["value"]> }
  | { kind: "done"; signature: string; value: NonNullable<SendValidation["value"]> }
  | { kind: "error"; message: string };

const FEE_SOL = lamportsToSol(BASE_FEE_LAMPORTS);

/** Two-step send: validate → review & confirm → submit, with the result announced via aria-live. */
export function SendForm({ from, balanceSol, demo, onSend, onCancel }: SendFormProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<SendValidation["errors"]>({});
  const [step, setStep] = useState<Step>({ kind: "edit" });

  const review = (e: FormEvent) => {
    e.preventDefault();
    const result = validateSend({ recipient, amount }, { from, balanceSol });
    setErrors(result.errors);
    if (result.ok && result.value) setStep({ kind: "review", value: result.value });
  };

  const confirm = async () => {
    if (step.kind !== "review") return;
    const { value } = step;
    setStep({ kind: "sending", value });
    try {
      const { signature } = await onSend(value.recipient, value.lamports);
      setStep({ kind: "done", signature, value });
      setRecipient("");
      setAmount("");
    } catch (err) {
      setStep({ kind: "error", message: friendlyError(err, "send") });
    }
  };

  const max = () => {
    if (balanceSol == null) return;
    setAmount(String(Math.max(0, lamportsToSol(Math.round(balanceSol * 1e9) - BASE_FEE_LAMPORTS))));
  };

  const status =
    step.kind === "sending" ? (
      "Sending transaction to devnet…"
    ) : step.kind === "error" ? (
      step.message
    ) : step.kind === "done" ? (
      <>
        Sent {formatSol(step.value.sol, { fee: true })} to {truncateAddress(step.value.recipient)}.{" "}
        <SignatureLink signature={step.signature} demo={demo} />
      </>
    ) : null;

  const editing = step.kind === "edit" || step.kind === "error" || step.kind === "done";

  return (
    <div id="send-form" className="mt-5 border-t border-cream-200 pt-5" data-testid="send-form">
      <h3 className="text-sm font-semibold">Send test SOL</h3>
      {editing ? (
        <form onSubmit={review} noValidate className="mt-3 flex flex-col gap-3">
          <Field
            label="Recipient address"
            name="recipient"
            autoComplete="off"
            spellCheck={false}
            placeholder="Devnet address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            error={errors.recipient}
          />
          <div className="flex items-end gap-2">
            <Field
              label="Amount (SOL)"
              name="amount"
              inputMode="decimal"
              placeholder="0.5"
              className="flex-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={errors.amount}
              hint={`Network fee ≈ ${formatSol(FEE_SOL, { fee: true })}`}
            />
            <Button variant="outline" size="md" onClick={max} className="mb-5">
              Max
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Review
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-col gap-3" data-testid="send-review">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-2xl bg-cream-50 p-3 text-sm ring-1 ring-cream-200">
            <dt className="text-ink-500">To</dt>
            <dd className="text-right font-mono" title={step.value.recipient}>
              {truncateAddress(step.value.recipient, 6)}
            </dd>
            <dt className="text-ink-500">Amount</dt>
            <dd className="text-right font-semibold">{formatSol(step.value.sol, { fee: true })}</dd>
            <dt className="text-ink-500">Network fee</dt>
            <dd className="text-right">{formatSol(FEE_SOL, { fee: true })}</dd>
          </dl>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => void confirm()}
              loading={step.kind === "sending"}
            >
              {step.kind === "sending"
                ? demo
                  ? "Sending…"
                  : "Approve in Phantom…"
                : "Confirm send"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setStep({ kind: "edit" })}
              disabled={step.kind === "sending"}
            >
              Back
            </Button>
          </div>
        </div>
      )}
      <StatusRegion
        className={status ? "mt-3" : undefined}
        testId="send-status"
        tone={step.kind === "error" ? "error" : step.kind === "done" ? "success" : "info"}
      >
        {status}
      </StatusRegion>
    </div>
  );
}
