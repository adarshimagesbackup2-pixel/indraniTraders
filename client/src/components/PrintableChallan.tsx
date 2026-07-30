import { forwardRef } from "react";
import type { Order } from "../hooks/useOrders";
import { formatCurrency, formatDate } from "../lib/format";
import { amountToWords } from "../lib/amountToWords";
import type { BusinessSettings } from "../hooks/useSettings";

interface PrintableChallanProps {
  order: Order;
  business: BusinessSettings;
}

export const PrintableChallan = forwardRef<HTMLDivElement, PrintableChallanProps>(({ order, business }, ref) => {
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

      <h2 className="mb-2 text-center text-lg font-semibold">Tax Invoice</h2>

      <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <strong>Invoice No:</strong> {order.challanNo}
        </div>
        <div className="text-right">
          <strong>Date:</strong> {formatDate(order.createdAt)}
        </div>
        <div>
          <strong>Customer:</strong> {order.customer.name}
          {order.customer.trademarkName && <div className="text-xs text-slate-500">{order.customer.trademarkName}</div>}
        </div>
        <div className="text-right">
          <strong>Vehicle:</strong> {order.transport.vehicleNo}
        </div>
        <div>
          <strong>Driver:</strong> {order.transport.driverName} ({order.transport.driverPhone})
        </div>
      </div>

      <table className="mb-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border border-slate-400 bg-slate-100">
            <th className="border border-slate-400 px-2 py-1 text-left">Bag Type</th>
            <th className="border border-slate-400 px-2 py-1 text-right">Qty</th>
            <th className="border border-slate-400 px-2 py-1 text-right">Rate</th>
            <th className="border border-slate-400 px-2 py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className="border border-slate-400 px-2 py-1">{item.bagType.bagType}</td>
              <td className="border border-slate-400 px-2 py-1 text-right">{item.quantity}</td>
              <td className="border border-slate-400 px-2 py-1 text-right">
                {item.pricingType === "PER_BAG" ? formatCurrency(item.ratePerBag ?? 0) : "Lump-sum"}
              </td>
              <td className="border border-slate-400 px-2 py-1 text-right">{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mb-4 flex flex-col items-end text-sm">
        <div className="w-56 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.gstEnabled && (
            <>
              <div className="flex justify-between">
                <span>CGST</span>
                <span>{formatCurrency(order.cgstAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST</span>
                <span>{formatCurrency(order.sgstAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between border-t border-slate-400 pt-1 font-bold">
            <span>Total</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="mb-8 text-sm italic">Amount in words: {amountToWords(order.totalAmount)}</div>

      <div className="flex justify-between text-sm">
        <div>Receiver's Signature: ______________________</div>
        <div>For {business.businessName}: ______________________</div>
      </div>
    </div>
  );
});
PrintableChallan.displayName = "PrintableChallan";
