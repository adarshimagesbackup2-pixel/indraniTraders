import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useReminderCandidates, useLogReminder } from "../hooks/useReminders";
import { useSettings } from "../hooks/useSettings";
import { Table, type Column } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { formatCurrency, formatDate } from "../lib/format";
import type { ReminderCandidate } from "../hooks/useReminders";

function buildMessage(template: string, vars: { customerName: string; balanceAmount: number; businessName: string }) {
  const currentDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
  return template
    .split("{customer_name}").join(vars.customerName)
    .split("{current_date}").join(currentDate)
    .split("{balance_amount}").join(vars.balanceAmount.toFixed(2))
    .split("{business_name}").join(vars.businessName);
}

export function RemindersPage() {
  const [sortBy, setSortBy] = useState<"balance" | "name" | "lastPayment">("balance");
  const { data: candidates, isLoading, isError, refetch } = useReminderCandidates(sortBy);
  const { data: settings } = useSettings();
  const logReminder = useLogReminder();

  // §5 — bulk "Send to All" queue state
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkQueue, setBulkQueue] = useState<ReminderCandidate[]>([]);
  const [bulkIndex, setBulkIndex] = useState(0);
  const [bulkActive, setBulkActive] = useState(false);

  const openWhatsapp = (candidate: ReminderCandidate) => {
    if (!settings) return;
    const message = buildMessage(settings.whatsappTemplate, {
      customerName: candidate.name,
      balanceAmount: candidate.balance,
      businessName: settings.businessName,
    });
    const url = `https://wa.me/91${candidate.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    logReminder.mutate({ customerId: candidate.customerId, balanceAtSend: candidate.balance });
  };

  const sendWhatsapp = (candidate: ReminderCandidate) => openWhatsapp(candidate);

  const startBulkSend = () => {
    if (!candidates || candidates.length === 0) return;
    setBulkQueue(candidates);
    setBulkIndex(0);
    setBulkConfirmOpen(false);
    setBulkActive(true);
    openWhatsapp(candidates[0]);
  };

  const sentNext = () => {
    const nextIndex = bulkIndex + 1;
    if (nextIndex >= bulkQueue.length) {
      setBulkActive(false);
      setBulkQueue([]);
      setBulkIndex(0);
      return;
    }
    setBulkIndex(nextIndex);
    openWhatsapp(bulkQueue[nextIndex]);
  };

  const totalOutstanding = candidates?.reduce((sum, c) => sum + c.balance, 0) ?? 0;

  const columns: Column<ReminderCandidate>[] = [
    { header: "Customer", accessor: (c) => c.name },
    { header: "Phone", accessor: (c) => c.phone },
    { header: "Balance", accessor: (c) => <span className="text-danger">{formatCurrency(c.balance)}</span> },
    { header: "Last Reminder", accessor: (c) => (c.lastReminderSentAt ? formatDate(c.lastReminderSentAt) : "Never") },
    { header: "Last Payment", accessor: (c) => (c.lastPaymentDate ? formatDate(c.lastPaymentDate) : "—") },
    {
      header: "Action",
      accessor: (c) => (
        <Button variant="secondary" onClick={() => sendWhatsapp(c)} className="gap-1">
          <MessageCircle className="h-4 w-4" /> Send WhatsApp
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Payment Reminders</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800"
          >
            <option value="balance">Sort by Highest Balance</option>
            <option value="name">Sort by Name</option>
            <option value="lastPayment">Sort by Oldest Payment</option>
          </select>
          <Button onClick={() => setBulkConfirmOpen(true)} disabled={!candidates || candidates.length === 0} className="gap-1">
            <Send className="h-4 w-4" /> Send to All
          </Button>
        </div>
      </div>

      {bulkActive && bulkQueue.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="mb-2 flex items-center justify-between text-sm font-medium">
            <span>
              Sending {bulkIndex + 1} of {bulkQueue.length} — {bulkQueue[bulkIndex]?.name}
            </span>
            <span>{formatCurrency(bulkQueue[bulkIndex]?.balance ?? 0)}</span>
          </div>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((bulkIndex + 1) / bulkQueue.length) * 100}%` }}
            />
          </div>
          <p className="mb-3 text-xs text-slate-500">
            A WhatsApp tab opened for {bulkQueue[bulkIndex]?.name}. Click "Send" in that tab, then come back and click
            below to move to the next customer.
          </p>
          <div className="flex gap-2">
            <Button onClick={sentNext}>Sent, Next →</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setBulkActive(false);
                setBulkQueue([]);
                setBulkIndex(0);
              }}
            >
              Stop
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <Table
          columns={columns}
          data={candidates}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          rowKey={(c) => c.customerId}
          emptyMessage="No customers with pending balances — everyone is clear! 🎉"
        />
      </div>

      <Modal isOpen={bulkConfirmOpen} onClose={() => setBulkConfirmOpen(false)} title="Send to All">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This will open WhatsApp for {candidates?.length ?? 0} customers with a combined outstanding of{" "}
            {formatCurrency(totalOutstanding)}. You'll need to click "Send" in each WhatsApp tab as it opens — browsers
            don't allow fully silent bulk sending. Continue?
          </p>
          <div className="flex gap-2">
            <Button onClick={startBulkSend} className="flex-1">
              Start Sending
            </Button>
            <Button variant="secondary" onClick={() => setBulkConfirmOpen(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
