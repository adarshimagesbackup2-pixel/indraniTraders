function sanitizeForFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "").trim();
}

/**
 * Prints the current page, but first sets the browser tab's title to
 * "{customer}-{invoiceNo}-{date}" — Chrome/Edge/Firefox all use the page
 * title as the suggested filename in the "Save as PDF" dialog, so this is
 * what actually controls the downloaded PDF's name. Title is restored
 * right after the print dialog closes.
 */
export function printInvoiceWithFilename(customerName: string, invoiceNo: string, date: string | Date) {
  const d = new Date(date);
  const datePart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const filename = `${sanitizeForFilename(customerName)}-${sanitizeForFilename(invoiceNo)}-${datePart}`;

  const originalTitle = document.title;
  document.title = filename;

  const restoreTitle = () => {
    document.title = originalTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };
  window.addEventListener("afterprint", restoreTitle);

  window.print();
}
/** Generic version of the invoice print trick, for any printable content
 * (not just invoices) — e.g. AI Assistant reports. */
export function printPageWithFilename(filename: string) {
  const originalTitle = document.title;
  document.title = filename;

  const restoreTitle = () => {
    document.title = originalTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };
  window.addEventListener("afterprint", restoreTitle);

  window.print();
}
