import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base dark input
          "flex h-9 w-full rounded-xl",
          "bg-brand-darker border border-brand-border",
          "px-3 py-2 text-sm text-white",
          "placeholder:text-brand-muted",
          "transition-all duration-200",
          "outline-none",
          "focus:border-[#FF4D00]/50 focus:shadow-[0_0_0_1px_rgba(255,77,0,0.20)]",
          "disabled:cursor-not-allowed disabled:opacity-40",
          error && "border-red-500/50 focus:border-red-500/70 focus:shadow-[0_0_0_1px_rgba(239,68,68,0.20)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
