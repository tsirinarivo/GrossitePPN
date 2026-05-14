"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "text-sm font-medium tracking-tight",
    "transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ring] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.97]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-[--primary] text-[--primary-foreground]",
          "hover:bg-[--primary-hover]",
          "shadow-sm",
        ],
        secondary: [
          "bg-[--secondary] text-[--secondary-foreground]",
          "hover:bg-[--secondary-hover]",
          "shadow-sm",
        ],
        destructive: [
          "bg-[--destructive] text-[--destructive-foreground]",
          "hover:opacity-90",
          "shadow-sm",
        ],
        outline: [
          "border border-[--border-strong] bg-transparent text-[--foreground]",
          "hover:bg-[--accent] hover:text-[--accent-foreground]",
        ],
        ghost: [
          "bg-transparent text-[--foreground]",
          "hover:bg-[--accent] hover:text-[--accent-foreground]",
        ],
        link: [
          "bg-transparent text-[--primary] underline-offset-4",
          "hover:underline",
          "h-auto p-0",
        ],
        success: [
          "bg-[--success] text-[--success-foreground]",
          "hover:opacity-90",
          "shadow-sm",
        ],
        // POS-specific — dark background, high contrast
        pos: [
          "bg-[--pos-primary] !text-white font-semibold",
          "hover:opacity-90",
          "shadow-md",
        ],
        "pos-ghost": [
          "bg-[--pos-surface-hover] text-[--pos-text] border border-[--pos-border]",
          "hover:bg-[--pos-border]",
        ],
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-11 w-11 p-0",
        "icon-xl": "h-14 w-14 p-0",
        // POS touch-optimized
        "pos-md": "h-12 px-5 text-base",
        "pos-lg": "h-16 px-6 text-lg font-semibold",
        "pos-icon": "h-12 w-12 p-0",
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
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
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
