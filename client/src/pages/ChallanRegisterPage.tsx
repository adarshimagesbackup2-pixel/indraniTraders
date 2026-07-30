import { useRef, useState } from "react";
import { MessageCircle, Printer } from "lucide-react";
import { useOrders, useSetEwayBillNo, downloadEwayJson, type Order } from "../hooks/useOrders";
import { useAuth } from "../context/AuthContext";
import { Table, type Column } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { OrderEditModal } from "../components/OrderEditModal";
import { OrderCancelModal } from "../components/OrderCancelModal";
import { PrintableChallan } from "../components/PrintableChallan";
import { useSettings } from "../hooks/useSettings";
import { formatCurrency, formatDate } from "../lib/format";
import { showToast, extractApiErrorMessage } from "../components/ui/Toast";

const EWAY_BADGE = { NOT_REQUIRED: "gray", PENDING: "amber", GENERATED: "green" } as const;

export function ChallanRegisterPage() {
  const [search, setSearch] = useState("");
  const [ewbModalOrder, setEwbModalOrder] = useState<Order | null>(null);
  const [ewbInput, setEwbInput] = useState("");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const { data, isLoading, isError, refetch } = useOrders({ search });
  const { data: settings } = useSettings();
  const setEwayBillNo = useSetEwayBillNo();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const columns: Column<Order>[] = [
    {
      header: "Invoice No",
      accessor: (o) => (
        <div className="flex items-center gap-2">
          <span className={o.status === "CANCELLED" ? "text-slate-400 line-through" : ""}>{o.challanNo}</span>
          {o.customerBillNo && <span className="text-xs text-slate-400">({o.customerBillNo})</span>}
          {o.editedAt && (
            <span title={`Edited by admin: ${o.editReason}`}>
              <Badge color="amber">Edited</Badge>
            </span>
          )}
          {o.status === "CANCELLED" && <Badge color="red">Cancelled</Badge>}
        </div>
      ),
    },
    { header: "Date", accessor: (o) => formatDate(o.createdAt) },
    { header: "Customer", accessor: (o) => o.customer.name },
    { header: "Vehicle", accessor: (o) => o.transport.vehicleNo },
    { header: "Total", accessor: (o) => formatCurrency(o.totalAmount) },
    {
      header: "E-Way Bill",
      accessor: (o) => (
        <div className="flex items-center gap-2">
          <Badge color={EWAY_BADGE[o.ewayBillStatus]}>{o.ewayBillStatus.replace("_", " ")}</Badge>
          {o.ewayBillStatus === "PENDING" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEwbModalOrder(o);
                setEwbInput("");
              }}
              className="text-xs text-primary hover:underline"
            >
              Enter EWB No.
            </button>
          )}
          {o.ewayBillStatus !== "NOT_REQUIRED" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadEwayJson(o.id, o.challanNo);
              }}
              className="text-xs text-primary hover:underline"
            >
              Export JSON
            </button>
          )}
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            header: "Actions",
            accessor: (o: Order) =>
              o.status === "CANCELLED" ? (
                <span className="text-xs text-slate-400">—</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInvoiceOrder(o);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Invoice
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingOrder(o);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCancellingOrder(o);
                    }}
                    className="text-xs text-danger hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ),
          },
        ]
      : []),
  ];

  const submitEwb = async () => {
    if (!ewbModalOrder) return;
    try {
      await setEwayBillNo.mutateAsync({ orderId: ewbModalOrder.id, ewayBillNo: ewbInput });
      showToast.success("E-Way Bill number saved");
      setEwbModalOrder(null);
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Invalid E-Way Bill number"));
    }
  };

  const openWhatsapp = (order: Order) => {
    if (!order.customer.phone) {
      showToast.error("This customer does not have a phone number on record");
      return;
    }
    const message = `Hello ${order.customer.name}, your invoice ${order.challanNo} for ₹${order.totalAmount.toFixed(2)} is ready. Thank you.`;
    const url = `https://wa.me/91${order.customer.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const printInvoice = () => {
    if (invoiceOrder) {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Invoices</h1>
        <Input placeholder="Search by invoice no. or customer…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <Table
          columns={columns}
          data={data?.data}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          rowKey={(o) => o.id}
          emptyMessage="No orders recorded yet"
        />
      </div>

      <Modal isOpen={!!ewbModalOrder} onClose={() => setEwbModalOrder(null)} title="Enter E-Way Bill Number">
        <div className="space-y-4">
          <Input label="12-digit EWB Number" value={ewbInput} onChange={(e) => setEwbInput(e.target.value)} maxLength={12} />
          <Button onClick={submitEwb} isLoading={setEwayBillNo.isPending} className="w-full">
            Save
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!invoiceOrder} onClose={() => setInvoiceOrder(null)} title="" maxWidthClass="max-w-3xl">
        <div className="space-y-4">
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="secondary" onClick={printInvoice} className="gap-1">
              <Printer className="h-4 w-4" /> Print Invoice
            </Button>
            {invoiceOrder?.customer.phone && (
              <Button variant="secondary" onClick={() => invoiceOrder && openWhatsapp(invoiceOrder)} className="gap-1">
                <MessageCircle className="h-4 w-4" /> Send WhatsApp
              </Button>
            )}
          </div>
          {invoiceOrder && settings && <PrintableChallan ref={printRef} order={invoiceOrder} business={settings} />}
        </div>
      </Modal>

      <OrderEditModal isOpen={!!editingOrder} onClose={() => setEditingOrder(null)} order={editingOrder} />
      <OrderCancelModal isOpen={!!cancellingOrder} onClose={() => setCancellingOrder(null)} order={cancellingOrder} />
    </div>
  );
}
