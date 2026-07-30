import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface DashboardSummary {
  totalOutstanding: number;
  todaysOrdersCount: number;
  todaysOrdersValue: number;
  monthCollections: number;
  lowStockCount: number;
  lowStockBags: Array<{ id: string; bagType: string; currentStock: number }>;
  last30DaysOrders: Array<{ createdAt: string; totalAmount: number }>;
  topCustomersByOutstanding: Array<{ id: string; name: string; balance: number }>;
  recentActivity: {
    orders: Array<{ id: string; challanNo: string; totalAmount: number; createdAt: string; customer: { name: string } }>;
    payments: Array<{ id: string; amount: number; date: string; customer: { name: string } }>;
    stock: Array<{ id: string; quantity: number; createdAt: string; bagType: { bagType: string } }>;
  };
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/summary");
      return data.data as DashboardSummary;
    },
  });
}

export interface DayBookData {
  date: string;
  ordersCount: number;
  totalOrdersValue: number;
  totalPayments: number;
  paymentsByMode: Record<string, number>;
  orders: Array<{ id: string; challanNo: string; customerName: string; totalAmount: number; createdAt: string }>;
  payments: Array<{ id: string; customerName: string; amount: number; paymentMode: string | null; date: string }>;
}

export function useDayBook(date?: string) {
  return useQuery({
    queryKey: ["daybook", date],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/daybook", { params: { date } });
      return data.data as DayBookData;
    },
  });
}
