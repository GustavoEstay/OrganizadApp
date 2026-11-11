import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const tones = {
  honey: "bg-honey-100 text-ink-900 ring-honey-300",
  pine: "bg-pine-50 text-pine-700 ring-pine-100",
  neutral: "bg-cream-100 text-ink-700 ring-cream-300",
  danger: "bg-rose-50 text-rose-800 ring-rose-200",
} as const;

const sizes = {
  sm: "px-2 py-0.5 text-[11px] gap-1.5",
  lg: "px-4 py-2 text-base gap-2.5",
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  /** Leading status dot. */
  dot?: boolean;
}

export function Badge({
  tone = "neutral",
  size = "sm",
  dot,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-medium whitespace-nowrap ring-1 ring-inset",
        tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("rounded-full bg-honey-500", size === "lg" ? "size-3.5" : "size-1.5")}
        />
      )}
      {children}
    </span>
  );
}
