"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-semibold tracking-tight",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D00]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.97]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        // Primary — gradient orange
        default: [
          "rounded-xl bg-gradient-to-br from-[#FF4D00] to-[#FF6B00] text-white shadow-sm",
          "hover:shadow-[0_0_30px_rgba(255,77,0,0.30)] hover:-translate-y-px",
          "active:translate-y-0",
        ],
        // Secondary — dark card
        secondary: [
          "rounded-xl bg-brand-card border border-brand-border text-brand-muted",
          "hover:border-[#FF4D00]/50 hover:text-[#FF4D00]",
        ],
        // Destructive
        destructive: [
          "rounded-xl bg-red-500/10 border border-red-500/20 text-red-400",
          "hover:bg-red-500/20 hover:border-red-500/40",
        ],
        // Ghost
        ghost: [
          "rounded-xl bg-transparent text-brand-muted",
          "hover:bg-white/5 hover:text-white",
        ],
        // Outline
        outline: [
          "rounded-xl border border-brand-border bg-transparent text-brand-muted",
          "hover:border-[#FF4D00]/50 hover:text-white hover:bg-white/5",
        ],
        // Link
        link: [
          "bg-transparent text-[#FF4D00] underline-offset-4",
          "hover:underline",
          "h-auto p-0",
        ],
        // Success
        success: [
          "rounded-xl bg-green-500/10 border border-green-500/20 text-green-400",
          "hover:bg-green-500/20 hover:border-green-500/40",
        ],
        // POS — interface agent (cohérent avec nouveau design)
        pos: [
          "rounded-xl bg-gradient-to-br from-[#FF4D00] to-[#FF6B00] !text-white font-semibold",
          "hover:shadow-[0_0_30px_rgba(255,77,0,0.30)] hover:-translate-y-px",
          "active:translate-y-0",
        ],
        "pos-ghost": [
          "rounded-xl bg-white/5 text-white/80 border border-white/10",
          "hover:bg-white/10 hover:text-white",
        ],
      },
      size: {
        default:   "h-9 px-4 py-2",
        sm:        "h-8 px-3 text-xs",
        lg:        "h-11 px-6 text-base",
        xl:        "h-14 px-8 text-lg",
        icon:      "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-11 w-11 p-0",
        "icon-xl": "h-14 w-14 p-0",
        "pos-md":  "h-12 px-5 text-base",
        "pos-lg":  "h-16 px-6 text-lg font-semibold",
        "pos-icon":"h-12 w-12 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin size-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
