import { useState } from "react";
import { useAuditLogs } from "../../hooks/useAuditLog";
import { Table, type Column } from "../ui/Table";
import { Input } from "../ui/Input";
import { formatDateTime } from "../../lib/format";
import type { AuditLogEntry } from "../../hooks/useAuditLog";

export function AuditLogTab() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useAuditLogs(search);

  const columns: Column<AuditLogEntry>[] = [
    { header: "When", accessor: (a) => formatDateTime(a.performedAt) },
    { header: "Action", accessor: (a) => a.action.replace(/_/g, " ") },
    { header: "Entity", accessor: (a) => `${a.entityType} (${a.entityId.slice(0, 8)}…)` },
    { header: "Performed By", accessor: (a) => a.performedById.slice(0, 8) + "…" },
    {
      header: "Details",
      accessor: (a) => {
        if (!a.details) return "—";
        try {
          const parsed = JSON.parse(a.details);
          return Object.entries(parsed)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
        } catch {
          return a.details;
        }
      },
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        A flat, searchable trail of every create/edit/delete/payment/blacklist action across the system.
      </p>
      <Input placeholder="Search by action or ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      <Table
        columns={columns}
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        rowKey={(a) => a.id}
        emptyMessage="No audit log entries yet"
      />
    </div>
  );
}
