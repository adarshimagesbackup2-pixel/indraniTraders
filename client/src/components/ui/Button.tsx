import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: "bg-primary hover:bg-primary-dark text-white shadow-sm shadow-primary/20",
  secondary: "bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700",
  danger: "bg-danger hover:bg-red-700 text-white shadow-sm shadow-red-600/20",
  ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", isLoading, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
