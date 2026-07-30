import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface MenuLabel {
  id: string;
  key: string;
  customLabel: string | null;
}

const DEFAULT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  orders: "New Order",
  khata: "Khata Register",
  stock: "Stock Register",
  challans: "Invoices",
  reminders: "Reminders",
  masters: "Masters",
};

export function useMenuLabels() {
  return useQuery({
    queryKey: ["menuLabels"],
    queryFn: async () => {
      const { data } = await api.get("/menu-labels");
      return data.data as MenuLabel[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Resolves a sidebar key to its display label — custom if set, otherwise the default English name. */
export function resolveMenuLabel(labels: MenuLabel[] | undefined, key: string): string {
  const found = labels?.find((l) => l.key === key);
  return found?.customLabel?.trim() || DEFAULT_LABELS[key] || key;
}

export function useUpdateMenuLabels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (labels: Array<{ key: string; customLabel: string }>) => {
      const { data } = await api.put("/menu-labels", { labels });
      return data.data as MenuLabel[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menuLabels"] }),
  });
}

export { DEFAULT_LABELS };
