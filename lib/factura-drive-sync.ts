import { isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchaseInvoices, purchases } from "@/lib/db/schema";
import { listFolderFilesRecursive } from "@/lib/google-drive";

export type FacturaSyncResult = {
  linkedFiles: number;
  linkedRows: number;
};

// Facturas filenames are far less consistent than P.O.'s ("Invoice#123.pdf",
// "IN-015563.pdf", "INV 36392.pdf", "In#90356.pdf", "Invoice 946238 (1).pdf"…)
// — this strips the common vendor-invoice prefixes/suffixes down to what's
// usually the vendor's own invoice number, which is what `purchases.invoiceNumber`
// was imported from.
function extractInvoiceCandidate(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/^invoices?\b[\s#:_-]*/i, "")
    .replace(/^inv\b[\s#:_-]*/i, "")
    .replace(/^in\b[\s#:_-]*/i, "")
    .replace(/\s*\(\d+\)$/, "")
    .trim();
}

// Picks up Factura PDFs sitting in Drive that were never uploaded through the
// app (so no purchase_invoices row exists for them at all) and links each one
// to every purchase line whose invoice_number matches — mirroring the P.O.
// Drive sync. Unlike P.O.'s, there's no "create the purchase if missing" step
// here: an invoice with no matching purchase.invoiceNumber is simply left
// alone rather than guessed at, since invoice-number formats are too
// inconsistent to safely invent a purchase record from a filename alone.
export async function syncFacturasFromDrive(): Promise<FacturaSyncResult> {
  const folderId = process.env.GOOGLE_DRIVE_INVOICE_FOLDER_ID;
  if (!folderId) {
    return { linkedFiles: 0, linkedRows: 0 };
  }

  const files = (await listFolderFilesRecursive(folderId)).filter((f) =>
    f.name.toLowerCase().endsWith(".pdf"),
  );

  const existing = await db
    .select({ driveFileId: purchaseInvoices.driveFileId })
    .from(purchaseInvoices)
    .where(isNotNull(purchaseInvoices.driveFileId));
  const linkedIds = new Set(existing.map((r) => r.driveFileId));

  const unlinked = files.filter((f) => !linkedIds.has(f.id));
  if (unlinked.length === 0) {
    return { linkedFiles: 0, linkedRows: 0 };
  }

  const candidates = await db
    .select({ id: purchases.id, invoiceNumber: purchases.invoiceNumber })
    .from(purchases)
    .where(isNotNull(purchases.invoiceNumber));

  const byInvoiceNumber = new Map<string, number[]>();
  for (const p of candidates) {
    const key = p.invoiceNumber!.trim().toLowerCase();
    if (!key) continue;
    const list = byInvoiceNumber.get(key) ?? [];
    list.push(p.id);
    byInvoiceNumber.set(key, list);
  }

  let linkedFiles = 0;
  let linkedRows = 0;

  for (const file of unlinked) {
    const candidate = extractInvoiceCandidate(file.name).toLowerCase();
    const purchaseIds = byInvoiceNumber.get(candidate);
    if (!purchaseIds || purchaseIds.length === 0) continue;

    await db.insert(purchaseInvoices).values(
      purchaseIds.map((id) => ({
        purchaseId: id,
        docType: "invoice" as const,
        fileName: file.name,
        mimeType: file.mimeType,
        fileSize: file.size,
        blobUrl: null,
        driveFileId: file.id,
        uploadedBy: null,
      })),
    );

    linkedFiles += 1;
    linkedRows += purchaseIds.length;
  }

  return { linkedFiles, linkedRows };
}
