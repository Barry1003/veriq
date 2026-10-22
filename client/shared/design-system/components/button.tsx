import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, type = "button", variant = "primary", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn("ds-button", className)}
        data-variant={variant}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
