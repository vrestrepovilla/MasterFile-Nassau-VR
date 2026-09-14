import { db } from "@/lib/db";
import { purchases } from "@/lib/db/schema";
import {
  fetchProcurementRows,
  findNewProcurementRows,
  procurementRowKey,
} from "@/lib/procurement-sheet";

export type PurchasesSheetSyncResult = {
  created: number;
};

// Brings any row added directly to the "Procurement - MASTER FILE USA"
// Google Sheet (instead of through the app's "+ Nueva compra" form) into the
// `purchases` table — the read half of Compras' Drive/Sheet sync. Matches by
// a P.O#+WR#+Invoice#+Amount composite key rather than the sheet's own "#"
// column, since that's blank on multi-WR continuation rows.
export async function syncPurchasesFromSheet(): Promise<PurchasesSheetSyncResult> {
  const rows = await fetchProcurementRows();
  if (rows.length === 0) {
    return { created: 0 };
  }

  const existing = await db
    .select({
      poNumber: purchases.poNumber,
      warehouseReceiptNumber: purchases.warehouseReceiptNumber,
      invoiceNumber: purchases.invoiceNumber,
      amount: purchases.amount,
    })
    .from(purchases);
  const existingKeys = new Set(existing.map(procurementRowKey));

  const newRows = findNewProcurementRows(rows, existingKeys);
  if (newRows.length === 0) {
    return { created: 0 };
  }

  await db.insert(purchases).values(newRows);

  return { created: newRows.length };
}
