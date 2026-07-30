import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  CustomerInput,
  CustomerUpdateInput,
  BlacklistToggleInput,
} from "@bardan/shared/validation/customer.schema";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  gstin: string | null;
  trademarkName: string | null;
  openingBalance: number;
  openingBalanceType: "DEBIT" | "CREDIT";
  creditLimit: number;
  isActive: boolean;
  outstandingBalance?: number;
  creditRemaining?: number | null;

  stateCode: string | null;
  pincode: string | null;
  shipToAddress: string | null;
  shipToGstin: string | null;
  shipToPincode: string | null;
  shipToStateCode: string | null;

  isBlacklisted: boolean;
  blacklistReason: string | null;
  blacklistedAt: string | null;
}

export function useCustomers(search = "", blacklistedOnly = false) {
  return useQuery({
    queryKey: ["customers", search, blacklistedOnly],
    queryFn: async () => {
      const { data } = await api.get("/customers", {
        params: { search, pageSize: 100, blacklistedOnly: blacklistedOnly || undefined },
      });
      return data.data.data as Customer[];
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${id}`);
      return data.data as Customer;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const { data } = await api.post("/customers", input);
      return data.data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CustomerUpdateInput }) => {
      const { data } = await api.put(`/customers/${id}`, input);
      return data.data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

// §4 — blacklist toggle
export function useSetBlacklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: BlacklistToggleInput }) => {
      const { data } = await api.put(`/customers/${id}/blacklist`, input);
      return data.data as Customer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer"] });
    },
  });
}
