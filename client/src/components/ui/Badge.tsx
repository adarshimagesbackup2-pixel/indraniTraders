import { ReactNode } from "react";

type BadgeColor = "green" | "red" | "amber" | "gray";

const colorClasses: Record<BadgeColor, string> = {
  green: "bg-green-100 text-success dark:bg-green-900/40",
  red: "bg-red-100 text-danger dark:bg-red-900/40",
  amber: "bg-amber-100 text-warning dark:bg-amber-900/40",
  gray: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export function Badge({ color, children }: { color: BadgeColor; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClasses[color]}`}>
      {children}
    </span>
  );
}
