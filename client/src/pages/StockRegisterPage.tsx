import { useState } from "react";
import { useBags } from "../hooks/useBags";
import { useStockAudit, useReorderSuggestion } from "../hooks/useStock";
import { Table, type Column } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { AddStockModal } from "../components/AddStockModal";
import { BulkStockAdjustModal } from "../components/BulkStockAdjustModal";
import { formatDateTime } from "../lib/format";
import type { Bag } from "../hooks/useBags";
import type { StockAuditLog } from "../hooks/useStock";

const HEALTH_COLOR = { OK: "green", NEAR: "amber", LOW: "red" } as const;

function ReorderSuggestion({ bagTypeId }: { bagTypeId: string }) {
  const { data } = useReorderSuggestion(bagTypeId);
  if (!data || data.suggestedQuantity <= 0) return null;
  return <span className="ml-2 text-xs text-slate-400">(suggest reordering ~{data.suggestedQuantity})</span>;
}

export function StockRegisterPage() {
  const { data: bags, isLoading, isError, refetch } = useBags();
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedBagId, setSelectedBagId] = useState<string | undefined>();
  const { data: auditData } = useStockAudit(selectedBagId);

  const bagColumns: Column<Bag>[] = [
    { header: "Bag Type", accessor: (b) => b.bagType },
    {
      header: "Current Stock",
      accessor: (b) => (
        <span>
          {b.currentStock}
          {b.stockHealth !== "OK" && <ReorderSuggestion bagTypeId={b.id} />}
        </span>
      ),
    },
    { header: "Threshold", accessor: (b) => b.lowStockThreshold },
    { header: "Default Rate", accessor: (b) => `₹${b.defaultRate}` },
    { header: "Health", accessor: (b) => <Badge color={HEALTH_COLOR[b.stockHealth]}>{b.stockHealth}</Badge> },
  ];

  const auditColumns: Column<StockAuditLog>[] = [
    { header: "Date", accessor: (a) => formatDateTime(a.createdAt) },
    { header: "Bag Type", accessor: (a) => a.bagType.bagType },
    { header: "Type", accessor: (a) => a.type.replace(/_/g, " ") },
    {
      header: "Quantity",
      accessor: (a) => <span className={a.quantity < 0 ? "text-danger" : "text-success"}>{a.quantity > 0 ? "+" : ""}{a.quantity}</span>,
    },
    { header: "Balance After", accessor: (a) => a.balanceAfter },
    { header: "Notes", accessor: (a) => a.notes ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Stock Register</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setBulkModalOpen(true)}>
            Bulk Adjust
          </Button>
          <Button onClick={() => setModalOpen(true)}>+ Add Stock</Button>
        </div>
      </div>

      <Card>
        <div className="mb-2 text-sm font-semibold">Bag Types</div>
        <Table
          columns={bagColumns}
          data={bags}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          rowKey={(b) => b.id}
          onRowClick={(b) => setSelectedBagId(b.id)}
          emptyMessage="No bag types configured yet"
        />
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between text-sm font-semibold">
          <span>Stock Audit Log {selectedBagId && bags ? `— ${bags.find((b) => b.id === selectedBagId)?.bagType}` : "(all)"}</span>
          {selectedBagId && (
            <button onClick={() => setSelectedBagId(undefined)} className="text-xs text-primary hover:underline">
              Show all
            </button>
          )}
        </div>
        <Table
          columns={auditColumns}
          data={auditData?.data}
          isLoading={false}
          isError={false}
          rowKey={(a) => a.id}
          emptyMessage="No stock movements recorded yet"
        />
      </Card>

      <AddStockModal isOpen={modalOpen} onClose={() => setModalOpen(false)} defaultBagTypeId={selectedBagId} />
      <BulkStockAdjustModal isOpen={bulkModalOpen} onClose={() => setBulkModalOpen(false)} />
    </div>
  );
}
