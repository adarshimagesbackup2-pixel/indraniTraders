import { useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Repeat, FileDown, Share2 } from "lucide-react";
import { useCustomerLedger, downloadStatementPdf } from "../hooks/useKhata";
import { useSettings } from "../hooks/useSettings";
import { useOrders } from "../hooks/useOrders";
import { api } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Table, type Column } from "../components/ui/Table";
import { PrintableStatement } from "../components/PrintableStatement";
import { RecordPaymentModal } from "../components/RecordPaymentModal";
import { formatBalance, formatCurrency, formatDate } from "../lib/format";
import { showToast } from "../components/ui/Toast";
import type { LedgerEntry } from "../hooks/useKhata";

// §7.5 — export the visible ledger entries to CSV, for the customer's own accounting / CA
function exportLedgerCsv(customerName: string, entries: LedgerEntry[]) {
  const header = ["Date", "Type", "Reference", "Debit", "Credit", "Balance"];
  const rows = entries.map((e) => [
    formatDate(e.date),
    e.type,
    e.order?.challanNo ?? e.referenceNo ?? "",
    e.type === "DEBIT" ? e.amount.toFixed(2) : "",
    e.type === "CREDIT" ? e.amount.toFixed(2) : "",
    e.runningBalance.toFixed(2),
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${customerName.replace(/\s+/g, "_")}_Ledger.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function CustomerLedgerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useCustomerLedger(customerId, from || undefined, to || undefined);
  const { data: settings } = useSettings();
  const { data: recentOrders } = useOrders({ customerId });
  const printRef = useRef<HTMLDivElement>(null);

  if (isLoading || !data) {
    return <div className="h-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />;
  }

  const balance = formatBalance(data.outstandingBalance);
  const lastOrder = recentOrders?.data?.[0];

  const columns: Column<LedgerEntry>[] = [
    { header: "Date", accessor: (r) => formatDate(r.date) },
    { header: "Type", accessor: (r) => <Badge color={r.type === "DEBIT" ? "red" : "green"}>{r.type}</Badge> },
    { header: "Reference", accessor: (r) => r.order?.challanNo ?? r.referenceNo ?? "—" },
    { header: "Debit", accessor: (r) => (r.type === "DEBIT" ? formatCurrency(r.amount) : "—") },
    { header: "Credit", accessor: (r) => (r.type === "CREDIT" ? formatCurrency(r.amount) : "—") },
    { header: "Balance", accessor: (r) => formatCurrency(r.runningBalance) },
  ];

  // §7.2 — repeat last order: prefill the New Order form via navigation state
  const handleRepeatOrder = () => {
    if (!lastOrder) return;
    navigate("/orders/new", {
      state: {
        prefill: {
          customerId: data.customer.id,
          transportId: lastOrder.transportId,
          gstEnabled: lastOrder.gstEnabled,
          items: lastOrder.items.map((i) => ({
            bagTypeId: i.bagTypeId,
            quantity: i.quantity,
            pricingType: i.pricingType,
            ratePerBag: i.ratePerBag ?? undefined,
          })),
        },
      },
    });
  };

  // §7.8 — share statement via WhatsApp; attach the PDF if the browser supports Web Share API with files
  const handleShareStatement = async () => {
    if (!settings) return;
    try {
      const response = await api.get(`/reports/khata/${data.customer.id}/pdf`, {
        params: { from: from || undefined, to: to || undefined },
        responseType: "blob",
      });
      const file = new File([response.data], `${data.customer.name}_Statement.pdf`, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Account Statement",
          text: `Statement for ${data.customer.name} from ${settings.businessName}`,
        });
        return;
      }
    } catch {
      // fall through to wa.me fallback below
    }

    const message = `Hi ${data.customer.name}, your account statement from ${settings.businessName} is ready. Please call or visit to collect it, or ask us to email/re-send it.`;
    window.open(`https://wa.me/91${data.customer.phone}?text=${encodeURIComponent(message)}`, "_blank");
    showToast.success("Opened WhatsApp — direct PDF attach isn't supported on this browser, so a message was sent instead.");
  };

  return (
    <div className="space-y-4">
      <Link to="/khata" className="no-print inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Khata Register
      </Link>

      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{data.customer.name}</h1>
          <div className="text-sm text-slate-500">{data.customer.phone} · {data.customer.address}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPaymentModalOpen(true)}>Record Payment</Button>
          {lastOrder && (
            <Button variant="secondary" onClick={handleRepeatOrder} className="gap-1">
              <Repeat className="h-4 w-4" /> Repeat Last Order
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            Print Statement
          </Button>
          {settings && (
            <Button
              variant="secondary"
              onClick={() => downloadStatementPdf(data.customer.id, data.customer.name, from || undefined, to || undefined)}
            >
              Download PDF
            </Button>
          )}
          <Button variant="secondary" onClick={() => exportLedgerCsv(data.customer.name, data.entries)} className="gap-1">
            <FileDown className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="secondary" onClick={handleShareStatement} className="gap-1">
            <Share2 className="h-4 w-4" /> Share via WhatsApp
          </Button>
        </div>
      </div>

      <div className="no-print grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">Outstanding Balance</div>
          <div className={`mt-1 text-2xl font-bold ${balance.isAdvance ? "text-success" : "text-danger"}`}>
            {balance.label}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Credit Limit</div>
          <div className="mt-1 text-2xl font-bold">
            {data.customer.creditLimit > 0 ? formatCurrency(data.customer.creditLimit) : "Unlimited"}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Last Payment</div>
          <div className="mt-1 text-lg font-semibold">
            {data.lastPaymentDate ? `${formatCurrency(data.lastPaymentAmount ?? 0)} on ${formatDate(data.lastPaymentDate)}` : "No payments yet"}
          </div>
        </Card>
      </div>

      <div className="no-print flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800" />
        </div>
      </div>

      <div className="no-print rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <Table
          columns={columns}
          data={data.entries}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          rowKey={(r) => r.id}
          emptyMessage="No transactions in this period"
        />
      </div>

      {settings && <PrintableStatement ref={printRef} detail={data} business={settings} from={from} to={to} />}

      {customerId && (
        <RecordPaymentModal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} customerId={customerId} />
      )}
    </div>
  );
}
