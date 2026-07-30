import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardSummary } from "../hooks/useDashboard";

export function LowStockBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useDashboardSummary();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const lowStockBags = data?.lowStockBags ?? [];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700">
        <Bell className="h-5 w-5" />
        {lowStockBags.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white">
            {lowStockBags.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          <div className="border-b border-slate-100 dark:border-slate-700 px-4 py-2 text-sm font-semibold">
            Low Stock Alerts
          </div>
          {lowStockBags.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">All stock levels are healthy.</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {lowStockBags.map((bag) => (
                <li key={bag.id} className="border-b border-slate-50 dark:border-slate-700 px-4 py-2 text-sm">
                  <span className="font-medium">{bag.bagType}</span>
                  <span className="ml-2 text-danger">{bag.currentStock} left</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/stock"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-center text-sm font-medium text-primary hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Go to Stock Register
          </Link>
        </div>
      )}
    </div>
  );
}
