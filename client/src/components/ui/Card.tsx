import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/80 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.18)] backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}
