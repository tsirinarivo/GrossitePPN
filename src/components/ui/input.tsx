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
          "flex h-9 w-full rounded-lg border border-[--border] bg-[--input]",
          "px-3 py-2 text-sm text-[--foreground]",
          "placeholder:text-[--foreground-subtle]",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[--ring] focus:ring-offset-0 focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[--destructive] focus:ring-[--destructive]",
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
