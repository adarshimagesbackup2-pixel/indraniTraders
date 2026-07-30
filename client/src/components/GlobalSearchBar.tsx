import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../lib/api";

interface SearchResult {
  type: "customer" | "order";
  id: string;
  label: string;
  sublabel: string;
}

export function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const [customersRes, ordersRes] = await Promise.all([
          api.get("/customers", { params: { search: query, pageSize: 5 } }),
          api.get("/orders", { params: { search: query, pageSize: 5 } }),
        ]);
        const customerResults: SearchResult[] = customersRes.data.data.data.map((c: { id: string; name: string; phone: string }) => ({
          type: "customer" as const,
          id: c.id,
          label: c.name,
          sublabel: c.phone,
        }));
        const orderResults: SearchResult[] = ordersRes.data.data.data.map(
          (o: { id: string; challanNo: string; customer: { name: string } }) => ({
            type: "order" as const,
            id: o.id,
            label: o.challanNo,
            sublabel: o.customer.name,
          })
        );
        setResults([...customerResults, ...orderResults]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setQuery("");
    setOpen(false);
    if (result.type === "customer") {
      navigate(`/khata/${result.id}`);
    } else {
      navigate(`/challans`);
    }
  };

  return (
    <div className="relative w-full max-w-xs" ref={ref}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search challans, customers, phone…"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-8 pr-3 text-sm dark:text-slate-100"
        />
      </div>
      {open && query.trim().length >= 2 && (
        <div className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          {loading && <div className="px-3 py-2 text-sm text-slate-400">Searching…</div>}
          {!loading && results.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No matches</div>}
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <span className="font-medium">{r.label}</span>
              <span className="text-xs text-slate-400">
                {r.type === "customer" ? "Customer" : "Order"} · {r.sublabel}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
