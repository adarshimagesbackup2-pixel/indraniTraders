import toast from "react-hot-toast";

export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
};

/** Extracts the API's error.message from an axios error, falling back to a generic message. */
export function extractApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const anyErr = err as { response?: { data?: { error?: { message?: string } } } };
  return anyErr?.response?.data?.error?.message ?? fallback;
}
