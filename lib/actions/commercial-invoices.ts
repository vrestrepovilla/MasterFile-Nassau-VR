"use server";

import { del, put } from "@vercel/blob";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireDepartmentWrite } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { commercialInvoices, containers, purchases } from "@/lib/db/schema";
import { deleteFromDrive, uploadToDrive } from "@/lib/google-drive";
import { syncCommercialInvoicesFromDrive } from "@/lib/ci-drive-sync";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function fileKindFor(fileName: string): "pdf" | "excel" | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "xlsx" || ext === "xls") return "excel";
  return null;
}

export async function uploadCommercialInvoice(formData: FormData) {
  const session = await requireDepartmentWrite("compras");

  const ciNumber = String(formData.get("ciNumber") ?? "").trim();
  const file = formData.get("file");
  if (!ciNumber || !(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_FILE_SIZE) return;

  const fileKind = fileKindFor(file.name);
  if (!fileKind) return;

  // Same-number match used by the bulk loader: prefer a purchase carrying
  // this Comm Inv #, otherwise a container listing it among its CI numbers.
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

  // Comm Invoices go straight to Drive now (folder already set up).
  const ciFolderId = process.env.GOOGLE_DRIVE_CI_FOLDER_ID;
  let blobUrl: string | null = null;
  let driveFileId: string | null = null;

  if (ciFolderId) {
    const bytes = Buffer.from(await file.arrayBuffer());
    driveFileId = await uploadToDrive(
      ciFolderId,
      file.name,
      file.type || "application/octet-stream",
      bytes,
    );
  } else {
    const blob = await put(`commercial-invoices/${ciNumber}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    blobUrl = blob.url;
  }

  await db.insert(commercialInvoices).values({
    ciNumber,
    fileKind,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    blobUrl,
    driveFileId,
    purchaseId: purchaseMatch?.id ?? null,
    containerId: containerMatchId,
    uploadedBy: Number(session.user.id),
  });

  revalidatePath("/compras/comm-invoices");
}

export async function deleteCommercialInvoice(id: number) {
  const session = await requireDepartmentWrite("compras");

  const [invoice] = await db
    .select({
      blobUrl: commercialInvoices.blobUrl,
      driveFileId: commercialInvoices.driveFileId,
    })
    .from(commercialInvoices)
    .where(eq(commercialInvoices.id, id));

  await db.delete(commercialInvoices).where(eq(commercialInvoices.id, id));

  if (invoice?.driveFileId) {
    await deleteFromDrive(invoice.driveFileId);
  } else if (invoice?.blobUrl) {
    await del(invoice.blobUrl).catch(() => {
      // Already gone or unreachable — the DB row is what matters for the UI.
    });
  }

  revalidatePath("/compras/comm-invoices");
}

// Manual trigger for the Commercial Invoices page: picks up any CI PDF
// sitting in Drive that was never uploaded through the app, and links it to
// a purchase/container by CI# the same way a manual upload would.
export async function syncCommercialInvoicesFromDriveAction() {
  await requireDepartmentWrite("compras");
  const result = await syncCommercialInvoicesFromDrive();

  revalidatePath("/compras/comm-invoices");

  redirect(`/compras/comm-invoices?synced=${result.linked}`);
}
