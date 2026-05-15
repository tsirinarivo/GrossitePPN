import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        // Couleurs solides — pas de transparence
        default:     "bg-ocre-100    text-ocre-700    ring-ocre-200",
        secondary:   "bg-vanille-100 text-vanille-700 ring-vanille-200",
        success:     "bg-green-100   text-green-700   ring-green-200",
        warning:     "bg-amber-100   text-amber-700   ring-amber-300",
        destructive: "bg-red-100     text-red-700     ring-red-200",
        outline:     "bg-transparent text-slate-700   ring-slate-300",
        muted:       "bg-slate-100   text-slate-600   ring-slate-200",
        // Sources commande
        pos: "bg-ocre-100   text-ocre-700   ring-ocre-200",
        web: "bg-indigo-100 text-indigo-700 ring-indigo-200",
        // Statuts
        live: "bg-green-100 text-green-700 ring-green-200 animate-pulse",
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
