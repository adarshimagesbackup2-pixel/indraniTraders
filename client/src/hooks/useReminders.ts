import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface ReminderCandidate {
  customerId: string;
  name: string;
  phone: string;
  balance: number;
  lastReminderSentAt: string | null;
  lastPaymentDate: string | null;
}

export function useReminderCandidates(sortBy: "balance" | "name" | "lastPayment" = "balance") {
  return useQuery({
    queryKey: ["reminders", sortBy],
    queryFn: async () => {
      const { data } = await api.get("/reminders/pending", { params: { sortBy } });
      return data.data as ReminderCandidate[];
    },
  });
}

export function useLogReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, balanceAtSend }: { customerId: string; balanceAtSend: number }) => {
      await api.post("/reminders/log", { customerId, balanceAtSend });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}
