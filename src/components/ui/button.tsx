import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils/cn";

const variants = {
  primary: "bg-pine-700 text-white shadow-sm hover:bg-pine-600 active:bg-pine-800",
  secondary: "bg-honey-400 text-ink-900 shadow-sm hover:bg-honey-300 active:bg-honey-500",
  outline:
    "bg-white text-ink-900 ring-1 ring-inset ring-cream-300 hover:bg-cream-50 active:bg-cream-100",
  ghost: "text-ink-700 hover:bg-cream-200/70 active:bg-cream-200",
} as const;

const sizes = {
  sm: "h-8 gap-1.5 rounded-full px-3 text-xs",
  md: "h-10 gap-2 rounded-full px-4 text-sm",
  lg: "h-12 gap-2 rounded-full px-6 text-base",
  icon: "size-9 rounded-full",
} as const;

export type ButtonVariant = keyof typeof variants;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof sizes;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600",
        "disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
