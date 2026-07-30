import { prisma } from "../prisma";
import { getLatestRunningBalance } from "./khata.service";
import { formatIndianCurrency } from "../utils/currency";

export interface ReminderCandidate {
  customerId: string;
  name: string;
  phone: string;
  balance: number;
  lastReminderSentAt: Date | null;
  lastPaymentDate: Date | null;
}

/**
 * Every customer with netBalance > 0, per §8.6. Sort options: Highest
 * Balance (default) / Name / Last Payment Date (oldest first — surfaces
 * the most overdue).
 */
export async function listReminderCandidates(
  sortBy: "balance" | "name" | "lastPayment" = "balance"
): Promise<ReminderCandidate[]> {
  const customers = await prisma.customer.findMany({ where: { isActive: true } });

  const candidates: ReminderCandidate[] = [];
  for (const customer of customers) {
    const balance = await getLatestRunningBalance(customer.id);
    if (balance <= 0) continue;

    const lastReminder = await prisma.reminderLog.findFirst({
      where: { customerId: customer.id },
      orderBy: { sentAt: "desc" },
    });
    const lastPayment = await prisma.khataLedger.findFirst({
      where: { customerId: customer.id, type: "CREDIT" },
      orderBy: { date: "desc" },
    });

    candidates.push({
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
      balance,
      lastReminderSentAt: lastReminder?.sentAt ?? null,
      lastPaymentDate: lastPayment?.date ?? null,
    });
  }

  if (sortBy === "name") {
    candidates.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "lastPayment") {
    candidates.sort((a, b) => {
      const aTime = a.lastPaymentDate?.getTime() ?? 0;
      const bTime = b.lastPaymentDate?.getTime() ?? 0;
      return aTime - bTime; // oldest first — most overdue
    });
  } else {
    candidates.sort((a, b) => b.balance - a.balance);
  }

  return candidates;
}

/** Substitutes the 4 template variables per §8.6 / §11. */
export function buildReminderMessage(
  template: string,
  vars: { customerName: string; balanceAmount: number; businessName: string }
): string {
  const currentDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return template
    .replaceAll("{customer_name}", vars.customerName)
    .replaceAll("{current_date}", currentDate)
    .replaceAll("{balance_amount}", formatIndianCurrency(vars.balanceAmount).replace("₹", ""))
    .replaceAll("{business_name}", vars.businessName);
}

export async function logReminderSent(customerId: string, balanceAtSend: number) {
  return prisma.reminderLog.create({
    data: { customerId, balanceAtSend, channel: "whatsapp" },
  });
}
