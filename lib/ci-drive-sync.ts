import { eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { commercialInvoices, containers, purchases } from "@/lib/db/schema";
import { listFolderFiles } from "@/lib/google-drive";

export type CiSyncResult = {
  linked: number;
};

// CI filenames look like "Commercial Invoice 31121.pdf" or
// "Commercial Invoice 31124 - Caybuilding.pdf" — the CI# is the first run of
// 4-6 digits (matches the pattern already used when this folder was first
// migrated from Vercel Blob).
function extractCiNumber(fileName: string): string | null {
  return fileName.match(/(\d{4,6})/)?.[1] ?? null;
}

// Picks up Commercial Invoice PDFs sitting in Drive that were never uploaded
// through the app (so no commercial_invoices row exists for them at all).
// Unlike P.O.'s/Facturas, a CI document doesn't need a parent purchase or
// container to exist — it's a standalone library keyed by CI# — so a new
// file just gets inserted directly, with the same "same-number match" used
// by the manual upload action to fill in purchaseId/containerId when found.
export async function syncCommercialInvoicesFromDrive(): Promise<CiSyncResult> {
  const folderId = process.env.GOOGLE_DRIVE_CI_FOLDER_ID;
  if (!folderId) {
    return { linked: 0 };
  }

  const files = (await listFolderFiles(folderId)).filter((f) =>
    f.name.toLowerCase().endsWith(".pdf"),
  );

  const existing = await db
    .select({ driveFileId: commercialInvoices.driveFileId })
    .from(commercialInvoices)
    .where(isNotNull(commercialInvoices.driveFileId));
  const linkedIds = new Set(existing.map((r) => r.driveFileId));

  const unlinked = files.filter((f) => !linkedIds.has(f.id));
  if (unlinked.length === 0) {
    return { linked: 0 };
  }

  let linked = 0;

  for (const file of unlinked) {
    const ciNumber = extractCiNumber(file.name);
    if (!ciNumber) continue;

    const [purchaseMatch] = await db
      .select({ id: purchases.id })
      .from(purchases)
      .where(eq(purchases.commInvoiceNumber, ciNumber))
      .limit(1);

    let containerMatchId: number | null = null;
    if (!purchaseMatch) {
      const [containerMatch] = await db
        .select({ id: containers.id })
        .from(containers)
        .where(sql`${containers.ciNumbers} ~ ('(^|,)\\s*' || ${ciNumber} || '\\s*(,|$)')`)
        .limit(1);
      containerMatchId = containerMatch?.id ?? null;
    }

    await db.insert(commercialInvoices).values({
      ciNumber,
      fileKind: "pdf",
      fileName: file.name,
      mimeType: file.mimeType,
      fileSize: file.size,
      blobUrl: null,
      driveFileId: file.id,
      purchaseId: purchaseMatch?.id ?? null,
      containerId: containerMatchId,
      uploadedBy: null,
    });

    linked += 1;
  }

  return { linked };
}
