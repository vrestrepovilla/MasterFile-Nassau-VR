import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchaseInvoices, purchases, users } from "@/lib/db/schema";

export async function getPurchaseInvoices(purchaseId: number) {
  return db
    .select({
      id: purchaseInvoices.id,
      docType: purchaseInvoices.docType,
      fileName: purchaseInvoices.fileName,
      mimeType: purchaseInvoices.mimeType,
      fileSize: purchaseInvoices.fileSize,
      uploadedAt: purchaseInvoices.uploadedAt,
    })
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.purchaseId, purchaseId))
    .orderBy(asc(purchaseInvoices.uploadedAt));
}

// Split by docType so the Purchases table can show separate attachment
// indicators for "PO #" (docType "po") and "Factura #" (docType "invoice")
// instead of one mixed count that could point either document's link at the
// wrong column — a purchase's P.O. is almost always uploaded before its
// Factura arrives, so without this split "Factura #" would link to the P.O.
export async function getPurchaseInvoiceSummaries(
  docType: "po" | "invoice",
): Promise<{ purchaseId: number; count: number; firstId: number }[]> {
  const rows = await db
    .select({
      purchaseId: purchaseInvoices.purchaseId,
      id: purchaseInvoices.id,
    })
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.docType, docType))
    .orderBy(asc(purchaseInvoices.uploadedAt));

  const map = new Map<number, { count: number; firstId: number }>();
  for (const row of rows) {
    const existing = map.get(row.purchaseId);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(row.purchaseId, { count: 1, firstId: row.id });
    }
  }
  return Array.from(map.entries()).map(([purchaseId, v]) => ({ purchaseId, ...v }));
}

export async function getAllPurchaseInvoices() {
  return db
    .select({
      id: purchaseInvoices.id,
      docType: purchaseInvoices.docType,
      fileName: purchaseInvoices.fileName,
      fileSize: purchaseInvoices.fileSize,
      uploadedAt: purchaseInvoices.uploadedAt,
      purchaseId: purchaseInvoices.purchaseId,
      vendor: purchases.vendor,
      project: purchases.project,
      poNumber: purchases.poNumber,
      uploadedByName: users.name,
    })
    .from(purchaseInvoices)
    .innerJoin(purchases, eq(purchaseInvoices.purchaseId, purchases.id))
    .leftJoin(users, eq(purchaseInvoices.uploadedBy, users.id))
    .orderBy(desc(purchaseInvoices.uploadedAt));
}
