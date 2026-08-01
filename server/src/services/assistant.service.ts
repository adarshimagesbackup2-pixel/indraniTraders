import { prisma } from "../prisma";
import { ApiError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { getLatestRunningBalance } from "./khata.service";

const GEMINI_MODEL = "gemini-2.0-flash";

async function buildBusinessSnapshot() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [customers, bags, recentOrders, recentPayments] = await Promise.all([
    prisma.customer.findMany({ where: { isActive: true } }),
    prisma.bagMaster.findMany({ where: { isActive: true } }),
    prisma.order.findMany({
      where: { status: "ACTIVE", createdAt: { gte: ninetyDaysAgo } },
      select: { totalAmount: true, createdAt: true },
    }),
    prisma.khataLedger.findMany({
      where: { type: "CREDIT", date: { gte: ninetyDaysAgo } },
      select: { amount: true, date: true },
    }),
  ]);

  const balances = await Promise.all(customers.map((c) => getLatestRunningBalance(c.id)));

  const topDebtors = customers
    .map((c, i) => ({ name: c.name, outstandingBalance: balances[i] }))
    .filter((c) => c.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
    .slice(0, 15);

  const totalOutstanding = balances.reduce((sum, b) => sum + Math.max(b, 0), 0);

  const lowStockBagTypes = bags
    .filter((b) => b.currentStock <= b.lowStockThreshold)
    .map((b) => ({ bagType: b.bagType, currentStock: b.currentStock, threshold: b.lowStockThreshold }));

  const blacklistedCustomers = customers.filter((c) => c.isBlacklisted).map((c) => c.name);

  return {
    asOf: new Date().toISOString(),
    totalActiveCustomers: customers.length,
    totalOutstandingRupees: totalOutstanding,
    topDebtorsByOutstandingBalance: topDebtors,
    blacklistedCustomers,
    lowStockBagTypes,
    last90Days: {
      ordersCount: recentOrders.length,
      ordersValueRupees: recentOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
      collectionsValueRupees: recentPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    },
  };
}

export async function askAssistant(question: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiError(503, "The AI Assistant isn't set up yet — add a GEMINI_API_KEY on the server.");
  }

  const snapshot = await buildBusinessSnapshot();

  const prompt = `You are a helpful business assistant for an Indian onion-bag (bardan) trading business.
Answer the owner's question using ONLY the JSON data below — never invent numbers. Amounts are in Indian Rupees (₹).
If the question needs data that isn't in the snapshot, say so clearly instead of guessing.
Keep answers concise and practical. If asked for a "report" or "summary", format it with short headings and bullet points.

DATA SNAPSHOT (as of ${snapshot.asOf}):
${JSON.stringify(snapshot)}

QUESTION: ${question}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      logger.error(`Gemini API error ${response.status}: ${errBody}`);
      throw new ApiError(502, "The AI assistant couldn't process that right now. Please try again.");
    }

    const json: any = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new ApiError(502, "The AI assistant returned an empty response. Please try again.");
    }
    return text as string;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.error(`Gemini API request failed: ${(err as Error).message}`);
    throw new ApiError(502, "Could not reach the AI assistant. Please try again in a moment.");
  } finally {
    clearTimeout(timeout);
  }
}
