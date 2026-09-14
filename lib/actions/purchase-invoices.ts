"use server";

import { del, put } from "@vercel/blob";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireDepartmentWrite } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { purchaseInvoices } from "@/lib/db/schema";
import { syncPricesFromPo } from "@/lib/po-price-extraction";
import { deleteFromDrive, uploadToDrive } from "@/lib/google-drive";
import { syncPurchaseOrdersFromDrive } from "@/lib/po-drive-sync";
import { syncFacturasFromDrive } from "@/lib/factura-drive-sync";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function uploadPurchaseInvoice(purchaseId: number, formData: FormData) {
  const session = await requireDepartmentWrite("compras");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_FILE_SIZE) return;

  const docType = formData.get("docType") === "po" ? "po" : "invoice";
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  // P.O.'s and Facturas each go to their own Drive folder now (both set up);
  // falls back to Blob only if the relevant folder id isn't configured.
  const driveFolderId =
    docType === "po"
      ? process.env.GOOGLE_DRIVE_PO_FOLDER_ID
      : process.env.GOOGLE_DRIVE_INVOICE_FOLDER_ID;
  let blobUrl: string | null = null;
  let driveFileId: string | null = null;

  if (driveFolderId) {
    driveFileId = await uploadToDrive(driveFolderId, file.name, mimeType, bytes);
  } else {
    const blob = await put(`purchases/${purchaseId}/${Date.now()}-${file.name}`, bytes, {
      access: "public",
      addRandomSuffix: true,
      contentType: mimeType,
    });
    blobUrl = blob.url;
  }

  await db.insert(purchaseInvoices).values({
    purchaseId,
    docType,
    fileName: file.name,
    mimeType,
    fileSize: file.size,
    blobUrl,
    driveFileId,
    uploadedBy: Number(session.user.id),
  });

  revalidatePath(`/compras/purchases/${purchaseId}`);
  revalidatePath("/compras/invoices");
  revalidatePath("/compras/pos");

  if (docType === "po") {
    await syncPricesFromPo(bytes).catch(() => {
      // A P.O. in a different layout still uploads fine — it just won't
      // feed the price database automatically.
    });
  }
}

export async function deletePurchaseInvoice(id: number, purchaseId: number) {
  await requireDepartmentWrite("compras");

  const [invoice] = await db
    .select({
      blobUrl: purchaseInvoices.blobUrl,
      driveFileId: purchaseInvoices.driveFileId,
    })
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.id, id));

  await db.delete(purchaseInvoices).where(eq(purchaseInvoices.id, id));

  if (invoice?.driveFileId) {
    await deleteFromDrive(invoice.driveFileId);
  } else if (invoice?.blobUrl) {
    await del(invoice.blobUrl).catch(() => {
      // Already gone or unreachable — the DB row is what matters for the UI.
    });
  }

  revalidatePath(`/compras/purchases/${purchaseId}`);
  revalidatePath("/compras/invoices");
}

// A single uploaded P.O./invoice file can be attached to several purchase
// lines that share the same P.O# (one row per line, same blobUrl/driveFileId)
// — this removes every row for the file at once instead of leaving orphans.
export async function deletePurchaseInvoiceGroup(ids: number[]) {
  await requireDepartmentWrite("compras");
  if (ids.length === 0) return;

  const rows = await db
    .select({
      purchaseId: purchaseInvoices.purchaseId,
      blobUrl: purchaseInvoices.blobUrl,
      driveFileId: purchaseInvoices.driveFileId,
    })
    .from(purchaseInvoices)
    .where(inArray(purchaseInvoices.id, ids));

  await db.delete(purchaseInvoices).where(inArray(purchaseInvoices.id, ids));

  const uniqueBlobUrls = new Set(rows.map((r) => r.blobUrl).filter((u): u is string => !!u));
  const uniqueDriveIds = new Set(rows.map((r) => r.driveFileId).filter((d): d is string => !!d));
  await Promise.all([
    ...Array.from(uniqueBlobUrls).map((url) => del(url).catch(() => {})),
    ...Array.from(uniqueDriveIds).map((fileId) => deleteFromDrive(fileId)),
  ]);

  const purchaseIds = new Set(rows.map((r) => r.purchaseId));
  for (const purchaseId of purchaseIds) {
    revalidatePath(`/compras/purchases/${purchaseId}`);
  }
  revalidatePath("/compras/invoices");
  revalidatePath("/compras/pos");
}

// Manual trigger for the P.O.'s page: picks up any P.O. PDF her team dropped
// straight into the Drive folder (instead of uploading through the app) and
// links it to every matching purchase line. Same sync a Vercel Cron job runs
// automatically once a day.
export async function syncPurchaseOrdersFromDriveAction() {
  await requireDepartmentWrite("compras");
  const result = await syncPurchaseOrdersFromDrive();

  revalidatePath("/compras/pos");
  revalidatePath("/compras/precios");
  revalidatePath("/compras/purchases");

  const params = new URLSearchParams();
  params.set("synced", String(result.linkedRows));
  params.set("created", String(result.createdPurchases));
  if (result.pendingPoNumbers.length > 0) {
    params.set("pending", result.pendingPoNumbers.join(","));
  }
  redirect(`/compras/pos?${params.toString()}`);
}

// Manual trigger for the Facturas page: picks up any vendor invoice PDF
// sitting in Drive that was never uploaded through the app, and links it to
// every matching purchase line by invoice number.
export async function syncFacturasFromDriveAction() {
  await requireDepartmentWrite("compras");
  const result = await syncFacturasFromDrive();

  revalidatePath("/compras/invoices");
  revalidatePath("/compras/purchases");

  const params = new URLSearchParams();
  params.set("synced", String(result.linkedRows));
  redirect(`/compras/invoices?${params.toString()}`);
}
