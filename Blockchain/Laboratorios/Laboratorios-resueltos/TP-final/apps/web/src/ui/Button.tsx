import type { ButtonHTMLAttributes } from "react";

export const actionClassName =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/60 bg-surface-raised px-3.5 py-2 text-sm font-semibold text-primary-strong no-underline transition hover:border-primary hover:bg-primary/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost";
};

export function Button({ className = "", variant = "default", ...props }: ButtonProps) {
  const variantClassName = variant === "ghost" ? "bg-transparent" : "";
  return (
    <button
      type="button"
      className={`${actionClassName} ${variantClassName} ${className}`.trim()}
      {...props}
    />
  );
}
