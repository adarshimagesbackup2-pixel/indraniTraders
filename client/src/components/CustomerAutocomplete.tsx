import { useState, useRef, useEffect } from "react";
import { useCustomers } from "../hooks/useCustomers";
import { formatBalance } from "../lib/format";
import { Badge } from "./ui/Badge";

interface CustomerAutocompleteProps {
  value: string | null;
  onChange: (
    customerId: string,
    creditLimit: number,
    outstandingBalance: number,
    isBlacklisted?: boolean,
    blacklistReason?: string | null
  ) => void;
  error?: string;
}

export function CustomerAutocomplete({ value, onChange, error }: CustomerAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: customers, isLoading } = useCustomers(query);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = customers?.find((c) => c.id === value);

  return (
    <div className="relative" ref={ref}>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Customer</label>
      <input
        value={selected ? selected.name : query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search by name or phone…"
        className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          error ? "border-danger" : "border-slate-300 dark:border-slate-600"
        }`}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {selected?.isBlacklisted && (
        <div className="mt-1">
          <Badge color="red">⚠ Blacklisted</Badge>
        </div>
      )}

      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          {isLoading && <div className="px-3 py-2 text-sm text-slate-400">Searching…</div>}
          {!isLoading && (customers?.length ?? 0) === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">No customers found</div>
          )}
          {customers?.map((c) => {
            const balance = formatBalance(c.outstandingBalance ?? 0);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id, c.creditLimit, c.outstandingBalance ?? 0, c.isBlacklisted, c.blacklistReason);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.phone}</span>
                  {c.isBlacklisted && <Badge color="red">⚠</Badge>}
                </span>
                <span className={`text-xs ${balance.isAdvance ? "text-success" : "text-danger"}`}>{balance.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
