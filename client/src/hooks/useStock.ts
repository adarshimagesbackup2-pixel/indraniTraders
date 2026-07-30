import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { StockAddInput, BulkStockAddInput } from "@bardan/shared/validation/stock.schema";

export interface StockAuditLog {
  id: string;
  bagTypeId: string;
  bagType: { bagType: string };
  type: string;
  quantity: number;
  balanceAfter: number;
  notes: string | null;
  createdAt: string;
}

export function useStockAudit(bagTypeId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ["stockAudit", bagTypeId, from, to],
    queryFn: async () => {
      const { data } = await api.get("/stock/audit-log", { params: { bagTypeId, from, to, pageSize: 100 } });
      return data.data as { data: StockAuditLog[]; total: number };
    },
  });
}

export function useAddStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockAddInput) => {
      const { data } = await api.post("/stock/add", input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bags"] });
      qc.invalidateQueries({ queryKey: ["stockAudit"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// §7.6 — bulk stock-take adjustment
export function useBulkAddStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkStockAddInput) => {
      const { data } = await api.post("/stock/bulk-add", input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bags"] });
      qc.invalidateQueries({ queryKey: ["stockAudit"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// §7.4 — low stock reorder suggestion
export function useReorderSuggestion(bagTypeId: string | undefined) {
  return useQuery({
    queryKey: ["reorderSuggestion", bagTypeId],
    queryFn: async () => {
      const { data } = await api.get(`/bags/${bagTypeId}/reorder-suggestion`);
      return data.data as { suggestedQuantity: number };
    },
    enabled: !!bagTypeId,
  });
}
