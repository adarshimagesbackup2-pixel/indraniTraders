import { forwardRef } from "react";
import type { CustomerLedgerDetail } from "../hooks/useKhata";
import type { BusinessSettings } from "../hooks/useSettings";
import { formatCurrency, formatDate } from "../lib/format";

interface PrintableStatementProps {
  detail: CustomerLedgerDetail;
  business: BusinessSettings;
  from?: string;
  to?: string;
}

export const PrintableStatement = forwardRef<HTMLDivElement, PrintableStatementProps>(
  ({ detail, business, from, to }, ref) => {
    const totalDebit = detail.entries.reduce((sum, entry) => sum + (entry.type === "DEBIT" ? entry.amount : 0), 0);
    const totalCredit = detail.entries.reduce((sum, entry) => sum + (entry.type === "CREDIT" ? entry.amount : 0), 0);

    return (
      <div ref={ref} className="print-only mx-auto max-w-2xl bg-white p-8 text-black">
        <div className="mb-4 border-b-2 border-primary pb-3">
          <h1 className="text-xl font-bold">{business.businessName}</h1>
          <div className="text-sm">{business.businessAddress}</div>
          <div className="text-sm">
            Phone: {business.businessPhone}
            {business.businessGstin && <> &nbsp;|&nbsp; GSTIN: {business.businessGstin}</>}
          </div>
        </div>

        <h2 className="mb-2 text-center text-lg font-semibold">Customer Ledger Statement</h2>
        <div className="mb-1 text-sm">
          <strong>{detail.customer.name}</strong> &nbsp;|&nbsp; {detail.customer.phone}
        </div>
        <div className="mb-4 text-sm">
          {detail.customer.address}
          {detail.customer.gstin && <> &nbsp;|&nbsp; GSTIN: {detail.customer.gstin}</>}
        </div>
        <div className="mb-4 text-sm">
          Period: {from ? formatDate(from) : "Beginning"} to {to ? formatDate(to) : "Today"}
        </div>

        <table className="mb-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border border-slate-400 bg-slate-100">
              <th className="border border-slate-400 px-2 py-1 text-left">Date</th>
              <th className="border border-slate-400 px-2 py-1 text-left">Type</th>
              <th className="border border-slate-400 px-2 py-1 text-left">Reference</th>
              <th className="border border-slate-400 px-2 py-1 text-right">Debit</th>
              <th className="border border-slate-400 px-2 py-1 text-right">Credit</th>
              <th className="border border-slate-400 px-2 py-1 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {detail.entries.map((e) => (
              <tr key={e.id}>
                <td className="border border-slate-400 px-2 py-1">{formatDate(e.date)}</td>
                <td className="border border-slate-400 px-2 py-1">{e.type}</td>
                <td className="border border-slate-400 px-2 py-1">{e.order?.challanNo ?? e.referenceNo ?? "-"}</td>
                <td className="border border-slate-400 px-2 py-1 text-right">
                  {e.type === "DEBIT" ? formatCurrency(e.amount) : "-"}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right">
                  {e.type === "CREDIT" ? formatCurrency(e.amount) : "-"}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right">{formatCurrency(e.runningBalance)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td colSpan={3} className="border border-slate-400 px-2 py-1 text-right">Total</td>
              <td className="border border-slate-400 px-2 py-1 text-right">{formatCurrency(totalDebit)}</td>
              <td className="border border-slate-400 px-2 py-1 text-right">{formatCurrency(totalCredit)}</td>
              <td className="border border-slate-400 px-2 py-1 text-right">{formatCurrency(detail.outstandingBalance)}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-right text-sm font-bold">Closing Balance: {formatCurrency(detail.outstandingBalance)}</div>
      </div>
    );
  }
);
PrintableStatement.displayName = "PrintableStatement";
