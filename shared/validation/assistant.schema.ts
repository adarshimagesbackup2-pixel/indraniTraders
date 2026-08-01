import { z } from "zod";

export const assistantAskSchema = z.object({
  question: z.string().trim().min(3, "Please enter a question").max(500, "Question is too long"),
});

export type AssistantAskInput = z.infer<typeof assistantAskSchema>;
