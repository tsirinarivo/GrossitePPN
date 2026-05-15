import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Brand orange
        default:     "bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/20",
        // Gold
        secondary:   "bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20",
        // Green
        success:     "bg-green-500/10  text-green-400  border border-green-500/20",
        // Amber
        warning:     "bg-amber-500/10  text-amber-400  border border-amber-500/20",
        // Red
        destructive: "bg-red-500/10    text-red-400    border border-red-500/20",
        // Neutre
        outline:     "bg-transparent   text-white/60   border border-white/10",
        muted:       "bg-white/5       text-white/50   border border-white/10",
        // Sources commande
        pos:         "bg-[#FF4D00]/10  text-[#FF4D00]  border border-[#FF4D00]/20",
        web:         "bg-blue-500/10   text-blue-400   border border-blue-500/20",
        // Live
        live:        "bg-green-500/10  text-green-400  border border-green-500/20 animate-pulse",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
