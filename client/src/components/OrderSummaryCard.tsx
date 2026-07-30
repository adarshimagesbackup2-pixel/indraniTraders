import { Card } from "./ui/Card";
import { formatCurrency } from "../lib/format";

interface OrderSummaryCardProps {
  subtotal: number;
  gstEnabled: boolean;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  creditWarning?: string | null;
}

export function OrderSummaryCard({
  subtotal,
  gstEnabled,
  cgstAmount,
  sgstAmount,
  totalAmount,
  creditWarning,
}: OrderSummaryCardProps) {
  return (
    <Card>
      <div className="mb-2 text-sm font-semibold">Order Summary</div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span className="mono">{formatCurrency(subtotal)}</span>
        </div>
        {gstEnabled && (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">CGST</span>
              <span className="mono">{formatCurrency(cgstAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SGST</span>
              <span className="mono">{formatCurrency(sgstAmount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-base font-bold">
          <span>Total</span>
          <span className="mono">{formatCurrency(totalAmount)}</span>
        </div>
      </div>
      {creditWarning && (
        <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-xs text-warning">
          {creditWarning}
        </div>
      )}
    </Card>
  );
}
