import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { BagCreateInput, BagUpdateInput } from "@bardan/shared/validation/bag.schema";

export interface Bag {
  id: string;
  bagType: string;
  defaultRate: number;
  currentStock: number;
  lowStockThreshold: number;
  hsnCode: string | null;
  isActive: boolean;
  stockHealth: "OK" | "NEAR" | "LOW";
  gstRate: number;
  unitOfMeasure: "BAG" | "PCS" | "KG" | "NOS";
}

export function useBags() {
  return useQuery({
    queryKey: ["bags"],
    queryFn: async () => {
      const { data } = await api.get("/bags");
      return data.data as Bag[];
    },
  });
}

export function useCreateBag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BagCreateInput) => {
      const { data } = await api.post("/bags", input);
      return data.data as Bag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bags"] }),
  });
}

export function useUpdateBag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: BagUpdateInput }) => {
      const { data } = await api.put(`/bags/${id}`, input);
      return data.data as Bag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bags"] }),
  });
}
