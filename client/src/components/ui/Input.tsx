import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm bg-white/90 dark:bg-slate-800/90 dark:text-slate-100 shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 ${
            error ? "border-danger" : "border-slate-300 dark:border-slate-700"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
