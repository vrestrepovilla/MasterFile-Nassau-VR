// Los 3 proveedores con los que Cay Building tiene credito en Nassau. El orden aqui es el mismo
// orden en que Valeria los pone en su Excel semanal (Ace, Premier Importers, Paint Suppliers).
export const OUTSTANDING_INVOICE_VENDORS = ["Ace", "Premier Importers", "Paint Suppliers"] as const;

export type OutstandingInvoiceVendor = (typeof OUTSTANDING_INVOICE_VENDORS)[number];

// El nombre del proyecto que usamos internamente (Master File) no siempre es el que la contadora
// reconoce - esto solo cambia como se ve en el Excel que le mandamos a ella, no toca el Master File.
const PROJECT_DISPLAY_OVERRIDES: Record<string, string> = {
  "Atlantis RT": "Atlantis Scaffold",
  "Ocean Club": "Ocean Club-Building D",
};

export function projectDisplayName(project: string): string {
  return PROJECT_DISPLAY_OVERRIDES[project] ?? project;
}

// "Invoice #P50912" / "P50912" -> 50912 (para ordenar de menor a mayor como en el Excel real,
// incluso con prefijos de letras).
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

// "26.09.04" - el formato de fecha que ya usa Valeria en los nombres de archivo.
export function shortDateStamp(date: Date): string {
  const yy = pad2(date.getFullYear() % 100);
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  return `${yy}.${mm}.${dd}`;
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

// Mismo patron que ya usa Valeria para los soportes de transferencia que le manda la contadora.
export function receiptFilename(date: Date, vendor: string, originalExt: string): string {
  return `${shortDateStamp(date)} - Transfer ${vendor} - See the AP${originalExt}`;
}
