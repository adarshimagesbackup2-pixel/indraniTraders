import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKhataOverview } from "../hooks/useKhata";
import { Table, type Column } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { formatBalance, formatCurrency, formatDate } from "../lib/format";
import type { KhataOverviewRow } from "../hooks/useKhata";

export function KhataRegisterPage() {
  const { data, isLoading, isError, refetch } = useKhataOverview();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = data?.filter(
    (row) =>
      row.name.toLowerCase().includes(search.toLowerCase()) || row.phone.includes(search)
  );

  const columns: Column<KhataOverviewRow>[] = [
    { header: "Customer", accessor: (r) => r.name },
    { header: "Phone", accessor: (r) => r.phone },
    { header: "Total Billed", accessor: (r) => formatCurrency(r.totalBilled) },
    { header: "Total Paid", accessor: (r) => formatCurrency(r.totalPaid) },
    {
      header: "Balance",
      accessor: (r) => {
        const balance = formatBalance(r.netOutstanding);
        return <span className={balance.isAdvance ? "text-success" : "text-danger"}>{balance.label}</span>;
      },
    },
    {
      header: "Status",
      accessor: (r) => <Badge color={r.status === "Clear" ? "green" : "red"}>{r.status}</Badge>,
    },
    {
      header: "Last Payment",
      accessor: (r) => (r.lastPaymentDate ? formatDate(r.lastPaymentDate) : "—"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Khata Register</h1>
        <Input placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <Table
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          rowKey={(r) => r.customerId}
          onRowClick={(r) => navigate(`/khata/${r.customerId}`)}
          emptyMessage="No customers with ledger activity yet"
        />
      </div>
    </div>
  );
}
