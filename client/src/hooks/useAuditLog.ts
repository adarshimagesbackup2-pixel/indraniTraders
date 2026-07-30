import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedById: string;
  performedAt: string;
  details: string | null;
}

export function useAuditLogs(search = "", entityType = "") {
  return useQuery({
    queryKey: ["auditLogs", search, entityType],
    queryFn: async () => {
      const { data } = await api.get("/audit-log", { params: { search, entityType, pageSize: 100 } });
      return data.data as { data: AuditLogEntry[]; total: number };
    },
  });
}
