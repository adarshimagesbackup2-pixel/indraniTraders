import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { prisma } from "../prisma";
import { ApiError } from "../middleware/errorHandler";
import { formatIndianCurrency } from "../utils/currency";

/**
 * Shared print CSS — the same rules used for on-screen print preview
 * (§7.6), so this PDF is pixel-identical to what "Print" produces in the
 * browser for the customer ledger statement.
 */
const PRINT_CSS = `
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #334155; font-size: 12px; }
  .mono { font-family: 'Roboto Mono', monospace; }
  h1 { font-size: 18px; margin-bottom: 2px; }
  .header { border-bottom: 2px solid #1F6F3A; padding-bottom: 10px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; font-size: 11px; }
  th { background: #F1F5F9; }
  .right { text-align: right; }
  .debit { color: #DC2626; }
  .credit { color: #16A34A; }
  .summary { display: flex; gap: 24px; margin-top: 16px; margin-bottom: 8px; }
  .summary div { flex: 1; }
`;

interface StatementParams {
  customerId: string;
  from?: string;
  to?: string;
}

function buildStatementHtml(
  business: { businessName: string; businessAddress: string; businessPhone: string; businessGstin: string | null },
  customer: { name: string; phone: string; address: string; gstin: string | null },
  entries: Array<{
    date: Date;
    type: string;
    reference: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }>,
  range: { from?: string; to?: string }
) {
  const rows = entries
    .map(
      (e) => `
      <tr>
        <td>${new Intl.DateTimeFormat("en-GB").format(e.date)}</td>
        <td class="${e.type === "DEBIT" ? "debit" : "credit"}">${e.type}</td>
        <td>${e.reference}</td>
        <td class="right mono">${e.debit ? formatIndianCurrency(e.debit) : "-"}</td>
        <td class="right mono">${e.credit ? formatIndianCurrency(e.credit) : "-"}</td>
        <td class="right mono">${formatIndianCurrency(e.runningBalance)}</td>
      </tr>`
    )
    .join("");

  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const finalBalance = entries.length ? entries[entries.length - 1].runningBalance : 0;

  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8" /><style>${PRINT_CSS}</style></head>
      <body>
        <div class="header">
          <h1>${business.businessName}</h1>
          <div>${business.businessAddress}</div>
          <div>Phone: ${business.businessPhone}${business.businessGstin ? ` &nbsp;|&nbsp; GSTIN: ${business.businessGstin}` : ""}</div>
        </div>
        <h2>Customer Ledger Statement</h2>
        <div><strong>${customer.name}</strong> &nbsp;|&nbsp; ${customer.phone}</div>
        <div>${customer.address}${customer.gstin ? ` &nbsp;|&nbsp; GSTIN: ${customer.gstin}` : ""}</div>
        <div>Period: ${range.from ?? "Beginning"} to ${range.to ?? "Today"}</div>
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Reference</th><th class="right">Debit</th><th class="right">Credit</th><th class="right">Balance</th></tr>
          </thead>
          <tbody>
            ${rows}
            <tr>
              <td colspan="3" class="right"><strong>Total</strong></td>
              <td class="right mono"><strong>${formatIndianCurrency(totalDebit)}</strong></td>
              <td class="right mono"><strong>${formatIndianCurrency(totalCredit)}</strong></td>
              <td class="right mono"><strong>${formatIndianCurrency(finalBalance)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="summary">
          <div><strong>Total Debit:</strong> <span class="mono">${formatIndianCurrency(totalDebit)}</span></div>
          <div><strong>Total Credit:</strong> <span class="mono">${formatIndianCurrency(totalCredit)}</span></div>
          <div><strong>Closing Balance:</strong> <span class="mono">${formatIndianCurrency(finalBalance)}</span></div>
        </div>
      </body>
    </html>`;
}

export async function generateStatementPdf({ customerId, from, to }: StatementParams): Promise<Buffer> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(404, "Customer not found");

  const business = await prisma.businessSettings.findUniqueOrThrow({ where: { id: "singleton" } });

  const where: Record<string, unknown> = { customerId };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const ledgerRows = await prisma.khataLedger.findMany({
    where,
    include: { order: true },
    orderBy: [{ date: "asc" }],
  });

  const entries = ledgerRows.map((row) => ({
    date: row.date,
    type: row.type,
    reference: row.order?.challanNo ?? row.referenceNo ?? "-",
    debit: row.type === "DEBIT" ? Number(row.amount) : 0,
    credit: row.type === "CREDIT" ? Number(row.amount) : 0,
    runningBalance: Number(row.runningBalance),
  }));

  const html = buildStatementHtml(business, customer, entries, { from, to });

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
