import { fetchSheetTabAsRows } from "@/lib/google-sheets";
import { purchases } from "@/lib/db/schema";

// Column order of the "Procurement - MASTER FILE USA" sheet tab — the same
// source spreadsheet the `purchases` table was originally imported from (see
// lib/db/schema.ts comment on `purchases`). Index-based, not header-matched,
// since the sheet's headers repeat ("Status" appears twice: purchase status
// and CI status) and can't be told apart by name alone.
const COL = {
  rowNumber: 0,
  vendor: 1,
  account: 2,
  invoiceNumber: 3,
  poNumber: 4,
  amount: 5,
  status: 6,
  dueDate: 7,
  paidOn: 8,
  paymentMethod: 9,
  leadTimeInFreight: 10,
  freightVendor: 11,
  warehouseReceiptNumber: 12,
  receivedOn: 13,
  weightLb: 14,
  volumeFt3: 15,
  commInvoiceNumber: 16,
  ciStatus: 17,
  project: 18,
  subProject: 19,
  notes: 20,
  payApp: 21,
  shippingMode: 22,
  containerNumber: 23,
} as const;

function cell(row: string[], index: number): string | null {
  const v = row[index]?.trim();
  return v ? v : null;
}

function parseMoney(row: string[], index: number): number | null {
  const raw = row[index];
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseNumber(row: string[], index: number): number | null {
  const raw = cell(row, index);
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// The sheet's date columns are M/D/YYYY (US format — confirmed by rows like
// "11/17/2025", which can't be D/M since there's no 17th month). The DB
// column is a strict `date` type, so anything that isn't this exact shape
// (e.g. "Overseas" typed into the wrong cell) is dropped rather than error.
function parseDate(row: string[], index: number): string | null {
  const raw = cell(row, index);
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export type ProcurementSheetRow = typeof purchases.$inferInsert;

function rowToPurchase(row: string[]): ProcurementSheetRow {
  return {
    source: "2026",
    // Not every row has a "#" — the sheet only numbers the first line of a
    // multi-WR P.O. group, leaving continuation rows blank — so this is
    // stored for reference but isn't the dedup key (see `rowKey` below).
    procurementRowNumber: parseNumber(row, COL.rowNumber),
    vendor: cell(row, COL.vendor),
    account: cell(row, COL.account),
    invoiceNumber: cell(row, COL.invoiceNumber),
    poNumber: cell(row, COL.poNumber),
    amount: parseMoney(row, COL.amount),
    status: cell(row, COL.status),
    dueDate: parseDate(row, COL.dueDate),
    paidOn: parseDate(row, COL.paidOn),
    paymentMethod: cell(row, COL.paymentMethod),
    leadTimeInFreight: parseDate(row, COL.leadTimeInFreight),
    freightVendor: cell(row, COL.freightVendor),
    warehouseReceiptNumber: cell(row, COL.warehouseReceiptNumber),
    receivedOn: parseDate(row, COL.receivedOn),
    weightLb: parseNumber(row, COL.weightLb),
    volumeFt3: parseNumber(row, COL.volumeFt3),
    commInvoiceNumber: cell(row, COL.commInvoiceNumber),
    ciStatus: cell(row, COL.ciStatus),
    project: cell(row, COL.project),
    subProject: cell(row, COL.subProject),
    notes: cell(row, COL.notes),
    payApp: cell(row, COL.payApp),
    shippingMode: cell(row, COL.shippingMode),
    containerNumber: cell(row, COL.containerNumber),
  };
}

// Fetches the sheet once per sync run — callers reuse this across every
// unmatched P.O# instead of re-fetching the whole (600+ row) sheet each time.
export async function fetchProcurementRows(): Promise<string[][]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_PROCUREMENT_ID;
  const gid = process.env.GOOGLE_SHEETS_PROCUREMENT_GID;
  if (!spreadsheetId || !gid) return [];

  const rows = await fetchSheetTabAsRows(spreadsheetId, gid);
  return rows.slice(1); // drop header row
}

// A P.O# routinely spans several sheet rows (one per WR/shipment line), same
// as in the `purchases` table.
export function findProcurementRowsByPoNumber(
  rows: string[][],
  poNumber: string,
): ProcurementSheetRow[] {
  return rows.filter((row) => cell(row, COL.poNumber) === poNumber).map(rowToPurchase);
}

// Composite natural key for "is this sheet row already imported as a
// purchase?" — the sheet's own "#" column isn't reliable for this (blank on
// continuation rows), but a P.O#+WR#+Invoice#+Amount combination is about as
// unique as a real shipment line gets.
export function procurementRowKey(row: {
  poNumber?: string | null;
  warehouseReceiptNumber?: string | null;
  invoiceNumber?: string | null;
  amount?: number | null;
}): string {
  return [row.poNumber, row.warehouseReceiptNumber, row.invoiceNumber, row.amount]
    .map((v) => v ?? "")
    .join("|");
}

// Every row that isn't already represented in `existingKeys` (built from
// current `purchases` rows via `procurementRowKey`) — skips rows with
// neither a vendor nor a P.O# (blank spacer rows in the sheet).
export function findNewProcurementRows(
  rows: string[][],
  existingKeys: Set<string>,
): ProcurementSheetRow[] {
  const result: ProcurementSheetRow[] = [];
  for (const row of rows) {
    const purchase = rowToPurchase(row);
    if (!purchase.vendor && !purchase.poNumber) continue;
    if (existingKeys.has(procurementRowKey(purchase))) continue;
    result.push(purchase);
  }
  return result;
}
