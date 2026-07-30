import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { OrderCreateInput, OrderEditInput } from "@bardan/shared/validation/order.schema";

export interface OrderItem {
  id: string;
  bagTypeId: string;
  bagType: { bagType: string; unitOfMeasure: string };
  quantity: number;
  pricingType: "PER_BAG" | "LUMPSUM";
  ratePerBag: number | null;
  lineTotal: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

export interface Order {
  id: string;
  challanNo: string;
  customerBillNo: string | null;
  customerId: string;
  customer: { id: string; name: string; phone?: string | null; trademarkName?: string | null; isBlacklisted?: boolean };
  transportId: string;
  transport: { vehicleNo: string; driverName: string; driverPhone: string };
  items: OrderItem[];
  subtotal: number;
  gstEnabled: boolean;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  ewayBillStatus: "NOT_REQUIRED" | "PENDING" | "GENERATED";
  ewayBillNo: string | null;
  transportationReason: string;
  transportMode: "ROAD" | "RAIL" | "AIR" | "SHIP";
  transportDocNo: string | null;
  transportDocDate: string | null;
  transDistanceKm: number | null;
  status: "ACTIVE" | "CANCELLED";
  editedAt: string | null;
  editedById: string | null;
  editReason: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OrderCreateInput) => {
      const { data } = await api.post("/orders", input);
      return data.data as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["bags"] });
      qc.invalidateQueries({ queryKey: ["khata"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export interface OrderListParams {
  page?: number;
  search?: string;
  customerId?: string;
  ewayStatus?: string;
  vehicleId?: string;
  from?: string;
  to?: string;
}

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: async () => {
      const { data } = await api.get("/orders", { params: { ...params, pageSize: 50 } });
      return data.data as { data: Order[]; total: number; page: number; pageSize: number };
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data.data as Order;
    },
    enabled: !!id,
  });
}

export function useSetEwayBillNo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, ewayBillNo }: { orderId: string; ewayBillNo: string }) => {
      const { data } = await api.put(`/orders/${orderId}/ewaybill`, { ewayBillNo });
      return data.data as Order;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

// §3 — edit + cancel
export function useEditOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, input }: { orderId: string; input: OrderEditInput }) => {
      const { data } = await api.put(`/orders/${orderId}`, input);
      return data.data as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["bags"] });
      qc.invalidateQueries({ queryKey: ["khata"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, cancelReason }: { orderId: string; cancelReason: string }) => {
      const { data } = await api.post(`/orders/${orderId}/cancel`, { cancelReason });
      return data.data as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["bags"] });
      qc.invalidateQueries({ queryKey: ["khata"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export async function downloadEwayJson(orderId: string, challanNo: string) {
  const response = await api.get(`/orders/${orderId}/json`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `EWB_${challanNo}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
