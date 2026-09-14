// The 3 vendors Cay Building has credit terms with in Nassau — same order
// Valeria uses in her weekly Excel (Ace, Premier Importers, Paint Suppliers).
export const OUTSTANDING_INVOICE_VENDORS = ["Ace", "Premier Importers", "Paint Suppliers"] as const;

export type OutstandingInvoiceVendor = (typeof OUTSTANDING_INVOICE_VENDORS)[number];

// "Invoice #P50912" / "P50912" -> 50912 (sorts low to high like the real
// Excel, even with letter prefixes).
export function invoiceSortKey(invoiceNumber: string | null): number {
  if (!invoiceNumber) return Number.MAX_SAFE_INTEGER;
  const digits = invoiceNumber.match(/\d+/g);
  if (!digits) return Number.MAX_SAFE_INTEGER;
  return Number(digits.join(""));
}

export function sortByInvoiceNumber<T extends { invoiceNumber: string | null }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const diff = invoiceSortKey(a.invoiceNumber) - invoiceSortKey(b.invoiceNumber);
    if (diff !== 0) return diff;
    return (a.invoiceNumber ?? "").localeCompare(b.invoiceNumber ?? "");
  });
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// "26.09.04" — the date-stamp format already used in filenames.
export function shortDateStamp(date: Date): string {
  const yy = pad2(date.getFullYear() % 100);
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  return `${yy}.${mm}.${dd}`;
}

export function receiptFilename(date: Date, vendor: string, originalExt: string): string {
  return `${shortDateStamp(date)} - Transfer ${vendor} - See the AP${originalExt}`;
}

export function excelFilename(date: Date): string {
  return `${shortDateStamp(date)} Outstanding Invoices.xlsx`;
}

export function pdfFilename(date: Date, vendor: string): string {
  return `${shortDateStamp(date)} Invoices ${vendor}.pdf`;
}

export function emailSubject(date: Date): string {
  return `${shortDateStamp(date)} Outstanding Invoices-Nassau`;
}

// The internal project name (Master File) isn't always what the accountant
// recognizes — this only changes how it looks in the Excel sent to her, not
// the Master File itself.
const PROJECT_DISPLAY_OVERRIDES: Record<string, string> = {
  "Atlantis RT": "Atlantis Scaffold",
  "Ocean Club": "Ocean Club-Building D",
};

export function projectDisplayName(project: string): string {
  return PROJECT_DISPLAY_OVERRIDES[project] ?? project;
}
