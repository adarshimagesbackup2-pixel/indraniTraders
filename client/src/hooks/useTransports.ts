import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { TransportInput, TransportUpdateInput } from "@bardan/shared/validation/transport.schema";

export interface Transport {
  id: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  isActive: boolean;
}

export function useTransports() {
  return useQuery({
    queryKey: ["transports"],
    queryFn: async () => {
      const { data } = await api.get("/transports");
      return data.data as Transport[];
    },
  });
}

export function useCreateTransport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransportInput) => {
      const { data } = await api.post("/transports", input);
      return data.data as Transport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transports"] }),
  });
}

export function useUpdateTransport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TransportUpdateInput }) => {
      const { data } = await api.put(`/transports/${id}`, input);
      return data.data as Transport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transports"] }),
  });
}
