import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useAskAssistant() {
  return useMutation({
    mutationFn: async (question: string) => {
      const { data } = await api.post("/assistant/ask", { question });
      return data.data.answer as string;
    },
  });
}
