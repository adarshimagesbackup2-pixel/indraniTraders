import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { PaymentCreateInput } from "@bardan/shared/validation/payment.schema";

export interface KhataOverviewRow {
  customerId: string;
  name: string;
  phone: string;
  totalBilled: number;
  totalPaid: number;
  netOutstanding: number;
  status: "Clear" | "Pending";
  lastPaymentDate: string | null;
}

export function useKhataOverview() {
  return useQuery({
    queryKey: ["khata"],
    queryFn: async () => {
      const { data } = await api.get("/khata");
      return data.data as KhataOverviewRow[];
    },
  });
}

export interface LedgerEntry {
  id: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  runningBalance: number;
  date: string;
  paymentMode: string | null;
  referenceNo: string | null;
  order: { challanNo: string } | null;
}

export interface CustomerLedgerDetail {
  customer: { id: string; name: string; phone: string; address: string; gstin: string | null; creditLimit: number };
  outstandingBalance: number;
  creditRemaining: number | null;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  entries: LedgerEntry[];
}

export function useCustomerLedger(customerId: string | undefined, from?: string, to?: string) {
  return useQuery({
    queryKey: ["khata", customerId, from, to],
    queryFn: async () => {
      const { data } = await api.get(`/khata/${customerId}`, { params: { from, to } });
      return data.data as CustomerLedgerDetail;
    },
    enabled: !!customerId,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentCreateInput) => {
      const { data } = await api.post("/payments", input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["khata"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export async function downloadStatementPdf(customerId: string, name: string, from?: string, to?: string) {
  const response = await api.get(`/reports/khata/${customerId}/pdf`, {
    params: { from, to },
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${name.replace(/\s+/g, "_")}_Statement_${from ?? "start"}_${to ?? "today"}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
