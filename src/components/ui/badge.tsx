import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[--primary]/10 text-[--primary] ring-[--primary]/20",
        secondary: "bg-[--secondary]/10 text-[--secondary] ring-[--secondary]/20",
        success: "bg-[--success]/10 text-[--success] ring-[--success]/20",
        warning: "bg-[--warning]/10 text-[--warning-foreground] ring-[--warning]/20",
        destructive: "bg-[--destructive]/10 text-[--destructive] ring-[--destructive]/20",
        outline: "bg-transparent text-[--foreground] ring-[--border]",
        muted: "bg-[--background-muted] text-[--foreground-muted] ring-[--border]",
        // Sources commande
        pos: "bg-ocre-100 text-ocre-700 ring-ocre-200 dark:bg-ocre-950 dark:text-ocre-300 dark:ring-ocre-800",
        web: "bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-800",
        // Statuts
        live: "bg-[--success]/15 text-[--success] ring-[--success]/25 animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
