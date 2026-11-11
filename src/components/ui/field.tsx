import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Labelled text input with an accessible error message (aria-invalid + aria-describedby). */
export function Field({ label, error, hint, className, id, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={inputId} className="text-xs font-medium text-ink-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-10 w-full rounded-xl bg-cream-50 px-3 text-sm text-ink-900 ring-1 ring-cream-300 ring-inset placeholder:text-ink-400",
          "focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:outline-none",
          error && "ring-rose-400",
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-rose-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
