import { prisma } from "../prisma";
import { ApiError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { getLatestRunningBalance } from "./khata.service";

const GEMINI_MODEL = "gemini-3.6-flash";

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

 const prompt = `You are a knowledgeable business assistant for an Indian onion-bag (bardan) trading business.

For any question about THIS business's actual numbers (its balances, stock, orders, customers, collections) —
answer strictly from the DATA SNAPSHOT below and never invent those specific figures. You CAN calculate, compare,
and reason across the snapshot — e.g. compare one month to another, compute percentage changes, rank customers —
as long as every number you use for this business traces back to the snapshot. If a question about this specific
business needs data that genuinely isn't in the snapshot, say so clearly instead of guessing.

For anything beyond this business's own numbers — general business advice, explaining GST/accounting concepts,
industry benchmarks or typical practices, suggestions for improving collections or stock management, or general
knowledge questions — use your own broader knowledge and judgment freely, the way any knowledgeable advisor would.
Just make it clear when you're giving a general estimate/opinion versus a hard number from this business's own data.

Keep answers concise and practical. If asked for a "report" or "summary", structure it with short section titles
and a line break between each point.
IMPORTANT — formatting: Reply in PLAIN TEXT only. Do NOT use Markdown syntax of any kind — no asterisks for bold/bullets (**, *), no pound signs for headings (#), no dashes as bullets, no backticks. For a list, just put each item on its own line, optionally with a number like "1." — nothing else.

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
