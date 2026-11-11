import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const tones = {
  info: "bg-cream-100 text-ink-700 ring-cream-300",
  success: "bg-pine-50 text-pine-800 ring-pine-100",
  error: "bg-rose-50 text-rose-800 ring-rose-200",
} as const;

/**
 * Transaction / action status. The wrapper is always mounted with aria-live so screen readers
 * announce changes (pending → confirmed / failed) as they happen.
 */
export function StatusRegion({
  tone = "info",
  children,
  className,
  testId,
}: {
  tone?: keyof typeof tones;
  children?: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div aria-live="polite" aria-atomic="true" data-testid={testId} className={className}>
      {children ? (
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-xs leading-relaxed ring-1 ring-inset",
            tones[tone],
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
