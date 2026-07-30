export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Negative balances (advance) are shown in green with "Advance" label, not a minus sign (§7.2). */
export function formatBalance(balance: number): { label: string; isAdvance: boolean } {
  if (balance <= 0) {
    return { label: `Advance ${formatCurrency(Math.abs(balance))}`, isAdvance: true };
  }
  return { label: formatCurrency(balance), isAdvance: false };
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(date)
  );
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(date));
}
