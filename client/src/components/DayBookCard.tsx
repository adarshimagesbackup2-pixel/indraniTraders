import { useRef } from "react";
import { Printer } from "lucide-react";
import { useDayBook } from "../hooks/useDashboard";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { formatCurrency, formatDate } from "../lib/format";

const MODE_LABELS: Record<string, string> = { CASH: "Cash", UPI: "UPI", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque" };

export function DayBookCard() {
  const { data } = useDayBook();
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Today's Closing Summary — {formatDate(data.date)}</div>
        <Button variant="secondary" onClick={() => window.print()} className="gap-1">
          <Printer className="h-4 w-4" /> Print Day Book
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <div className="text-xs text-slate-500">Orders Today</div>
          <div className="text-lg font-bold">{data.ordersCount}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Orders Value</div>
          <div className="text-lg font-bold">{formatCurrency(data.totalOrdersValue)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Payments Received</div>
          <div className="text-lg font-bold text-success">{formatCurrency(data.totalPayments)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Cash / UPI / Bank</div>
          <div className="text-sm font-semibold">
            {formatCurrency(data.paymentsByMode.CASH ?? 0)} / {formatCurrency(data.paymentsByMode.UPI ?? 0)} /{" "}
            {formatCurrency((data.paymentsByMode.BANK_TRANSFER ?? 0) + (data.paymentsByMode.CHEQUE ?? 0))}
          </div>
        </div>
      </div>

      {/* Printable one-page day book */}
      <div ref={printRef} className="print-only mx-auto max-w-2xl bg-white p-8 text-black">
        <h1 className="mb-1 text-lg font-bold">Day Book — {formatDate(data.date)}</h1>
        <div className="mb-4 text-sm">
          Orders: {data.ordersCount} · Value: {formatCurrency(data.totalOrdersValue)} · Payments: {formatCurrency(data.totalPayments)}
        </div>

        <h2 className="mb-1 text-sm font-semibold">Orders</h2>
        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border border-slate-400 bg-slate-100">
              <th className="border border-slate-400 px-2 py-1 text-left">Challan No</th>
              <th className="border border-slate-400 px-2 py-1 text-left">Customer</th>
              <th className="border border-slate-400 px-2 py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.id}>
                <td className="border border-slate-400 px-2 py-1">{o.challanNo}</td>
                <td className="border border-slate-400 px-2 py-1">{o.customerName}</td>
                <td className="border border-slate-400 px-2 py-1 text-right">{formatCurrency(o.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="mb-1 text-sm font-semibold">Payments</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border border-slate-400 bg-slate-100">
              <th className="border border-slate-400 px-2 py-1 text-left">Customer</th>
              <th className="border border-slate-400 px-2 py-1 text-left">Mode</th>
              <th className="border border-slate-400 px-2 py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.payments.map((p) => (
              <tr key={p.id}>
                <td className="border border-slate-400 px-2 py-1">{p.customerName}</td>
                <td className="border border-slate-400 px-2 py-1">{p.paymentMode ? MODE_LABELS[p.paymentMode] : "—"}</td>
                <td className="border border-slate-400 px-2 py-1 text-right">{formatCurrency(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
