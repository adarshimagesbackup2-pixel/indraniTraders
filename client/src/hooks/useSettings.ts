import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { SettingsUpdateInput } from "@bardan/shared/validation/settings.schema";

export interface BusinessSettings {
  businessName: string;
  businessGstin: string | null;
  businessAddress: string;
  businessPhone: string;
  whatsappTemplate: string;
  gstEnabledDefault: boolean;
  cgstPercent: number;
  sgstPercent: number;
  ewayThreshold: number;
  reminderDayOfMonth: number;

  businessPincode: string | null;
  businessStateCode: string | null;
  businessAddressLine1: string | null;
  businessAddressLine2: string | null;
  businessPlace: string | null;
  turnoverAboveFiveCr: boolean;
  defaultTransportMode: "ROAD" | "RAIL" | "AIR" | "SHIP";
  defaultTransportationReason: string;
  ewayThresholdIntrastate: number;
  ewayThresholdInterstate: number;

  numberingMode: "AUTO" | "MANUAL";
  financialYearStartMonth: number;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get("/settings");
      return data.data as BusinessSettings;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SettingsUpdateInput) => {
      const { data } = await api.put("/settings", input);
      return data.data as BusinessSettings;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useRecalculateBalances() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/settings/recalculate-balances");
      return data.data as { customersProcessed: number };
    },
  });
}
