import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-3xl bg-white shadow-[0_8px_24px_-12px_rgba(60,40,10,0.18)] ring-1 ring-cream-300/70",
        className,
      )}
      {...props}
    />
  );
}
