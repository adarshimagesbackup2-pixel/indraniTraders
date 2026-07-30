import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardSummary } from "../hooks/useDashboard";
import { Card } from "../components/ui/Card";
import { DayBookCard } from "../components/DayBookCard";
import { formatCurrency, formatDate } from "../lib/format";

export function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    );
  }

  const chartData = data.last30DaysOrders.reduce<Record<string, number>>((acc, o) => {
    const day = formatDate(o.createdAt);
    acc[day] = (acc[day] ?? 0) + o.totalAmount;
    return acc;
  }, {});
  const lineData = Object.entries(chartData).map(([day, total]) => ({ day, total }));

  return (
    <div className="space-y-6">
      <div className="no-print">
        <DayBookCard />
      </div>

      <div className="no-print grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-sm text-slate-500">Total Outstanding</div>
          <div className="mt-1 text-2xl font-bold text-danger">{formatCurrency(data.totalOutstanding)}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Today's Orders</div>
          <div className="mt-1 text-2xl font-bold">{data.todaysOrdersCount}</div>
          <div className="text-xs text-slate-500">{formatCurrency(data.todaysOrdersValue)}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">This Month's Collections</div>
          <div className="mt-1 text-2xl font-bold text-success">{formatCurrency(data.monthCollections)}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Low Stock Alerts</div>
          <div className="mt-1 text-2xl font-bold text-warning">{data.lowStockCount}</div>
          <Link to="/stock" className="text-xs text-primary hover:underline">
            View Stock Register
          </Link>
        </Card>
      </div>

      <div className="no-print grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 text-sm font-semibold">Orders — Last 30 Days</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={Math.ceil(lineData.length / 6)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="total" stroke="#1F6F3A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="mb-2 text-sm font-semibold">Top 5 Customers by Outstanding</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topCustomersByOutstanding} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="balance" fill="#DC2626" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="no-print">
        <div className="mb-2 text-sm font-semibold">Recent Activity</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500">Orders</div>
            <ul className="space-y-1 text-sm">
              {data.recentActivity.orders.map((o) => (
                <li key={o.id} className="flex justify-between">
                  <span>{o.customer.name}</span>
                  <span className="mono">{formatCurrency(o.totalAmount)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500">Payments</div>
            <ul className="space-y-1 text-sm">
              {data.recentActivity.payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.customer.name}</span>
                  <span className="mono text-success">{formatCurrency(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500">Stock Changes</div>
            <ul className="space-y-1 text-sm">
              {data.recentActivity.stock.map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>{s.bagType.bagType}</span>
                  <span className={`mono ${s.quantity < 0 ? "text-danger" : "text-success"}`}>
                    {s.quantity > 0 ? "+" : ""}
                    {s.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
