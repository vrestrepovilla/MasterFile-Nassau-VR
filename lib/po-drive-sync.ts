import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchaseInvoices, purchases } from "@/lib/db/schema";
import { downloadFromDrive, listFolderFiles } from "@/lib/google-drive";
import { syncPricesFromPo } from "@/lib/po-price-extraction";
import { fetchProcurementRows, findProcurementRowsByPoNumber } from "@/lib/procurement-sheet";

export type PoSyncResult = {
  linkedFiles: number;
  linkedRows: number;
  createdPurchases: number;
  pendingPoNumbers: string[];
};

// A P.O. filename always looks like "Applitech P.O#1741.pdf" — the PO# is
// the first run of digits.
function extractPoNumber(fileName: string): string | null {
  return fileName.match(/(\d+)/)?.[1] ?? null;
}

// Picks up P.O. PDFs her team drops directly into the Drive folder (instead
// of uploading through the app) and links each one to every purchase line
// sharing its P.O# — mirroring how the original bulk migration attached one
// P.O. to several WR shipment lines. A P.O# with no matching purchase yet
// gets one created automatically from the "Procurement - MASTER FILE USA"
// sheet (the same source the `purchases` table was originally imported
// from) — only a P.O# missing from *both* the app and that sheet ends up in
// `pendingPoNumbers`.
export async function syncPurchaseOrdersFromDrive(): Promise<PoSyncResult> {
  const folderId = process.env.GOOGLE_DRIVE_PO_FOLDER_ID;
  if (!folderId) {
    return { linkedFiles: 0, linkedRows: 0, createdPurchases: 0, pendingPoNumbers: [] };
  }

  const files = (await listFolderFiles(folderId)).filter((f) =>
    f.name.toLowerCase().endsWith(".pdf"),
  );

  const existing = await db
    .select({ driveFileId: purchaseInvoices.driveFileId })
    .from(purchaseInvoices)
    .where(isNotNull(purchaseInvoices.driveFileId));
  const linkedIds = new Set(existing.map((r) => r.driveFileId));

  const unlinked = files.filter((f) => !linkedIds.has(f.id));

  let linkedFiles = 0;
  let linkedRows = 0;
  let createdPurchases = 0;
  const pendingPoNumbers: string[] = [];

  // Fetched lazily, once, only if a file actually needs it — most sync runs
  // have nothing unmatched and shouldn't pay for a 600+ row sheet export.
  let sheetRows: string[][] | null = null;

  for (const file of unlinked) {
    const poNumber = extractPoNumber(file.name);
    let purchaseIds = poNumber
      ? (
          await db
            .select({ id: purchases.id })
            .from(purchases)
            .where(eq(purchases.poNumber, poNumber))
        ).map((r) => r.id)
      : [];

    if (purchaseIds.length === 0 && poNumber) {
      if (sheetRows === null) {
        sheetRows = await fetchProcurementRows().catch(() => []);
      }
      const sheetMatches = findProcurementRowsByPoNumber(sheetRows, poNumber);
      if (sheetMatches.length > 0) {
        const inserted = await db
          .insert(purchases)
          .values(sheetMatches)
          .returning({ id: purchases.id });
        purchaseIds = inserted.map((r) => r.id);
        createdPurchases += inserted.length;
      }
    }

    if (purchaseIds.length === 0) {
      pendingPoNumbers.push(poNumber ?? file.name);
      continue;
    }

    const { bytes, mimeType } = await downloadFromDrive(file.id);

    await db.insert(purchaseInvoices).values(
      purchaseIds.map((id) => ({
        purchaseId: id,
        docType: "po" as const,
        fileName: file.name,
        mimeType,
        fileSize: file.size,
        blobUrl: null,
        driveFileId: file.id,
        uploadedBy: null,
      })),
    );

    linkedFiles += 1;
    linkedRows += purchaseIds.length;

    await syncPricesFromPo(bytes).catch(() => {
      // A P.O. in a different layout still links fine — it just won't feed
      // the price database automatically.
    });
  }

  return { linkedFiles, linkedRows, createdPurchases, pendingPoNumbers };
}
