import { useBags } from "../hooks/useBags";

interface BagTypeSelectProps {
  value: string;
  onChange: (bagTypeId: string) => void;
  error?: string;
}

export function BagTypeSelect({ value, onChange, error }: BagTypeSelectProps) {
  const { data: bags } = useBags();

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          error ? "border-danger" : "border-slate-300 dark:border-slate-600"
        }`}
      >
        <option value="">Select bag type…</option>
        {bags?.map((bag) => (
          <option key={bag.id} value={bag.id} disabled={bag.currentStock === 0}>
            {bag.bagType} ({bag.currentStock} in stock)
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
