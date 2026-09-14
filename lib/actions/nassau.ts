"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireDepartmentWrite } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { nassauInvoiceMatches, nassauMasterFileEntries, nassauPaymentReceipts } from "@/lib/db/schema";
import { num, str } from "@/lib/form-utils";
import {
  buildInvoiceFilename,
  deleteNassauFileFromDrive,
  moveNassauFileToVendorFolder,
  renameNassauFileInDrive,
  uploadNassauInvoiceFile,
} from "@/lib/nassau/google-drive";
import { syncNassauFromOdoo } from "@/lib/nassau/odoo-sync";
import { syncNassauInvoiceEmails } from "@/lib/nassau/invoice-email-sync";
import {
  OUTSTANDING_INVOICE_VENDORS,
  emailSubject,
  excelFilename,
  pdfFilename,
  receiptFilename,
} from "@/lib/nassau/outstanding";
import { buildOutstandingExcelBuffer, buildVendorInvoicesPdf } from "@/lib/nassau/outstanding-report";
import { createDraftWithAttachments, type DraftAttachment } from "@/lib/nassau/gmail";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function readEntryValues(formData: FormData) {
  return {
    vendor: str(formData, "vendor") ?? "",
    account: str(formData, "account"),
    invoiceNumber: str(formData, "invoiceNumber"),
    poNumber: str(formData, "poNumber") ?? "",
    amount: num(formData, "amount"),
    paymentStatus: str(formData, "paymentStatus"),
    dueDate: str(formData, "dueDate"),
    paidOn: str(formData, "paidOn"),
    paymentMethod: str(formData, "paymentMethod"),
    freightLeadTime: str(formData, "freightLeadTime"),
    freightCost: num(formData, "freightCost"),
    wrNumber: str(formData, "wrNumber"),
    receivedOn: str(formData, "receivedOn"),
    weightLb: num(formData, "weightLb"),
    volumeFt3: num(formData, "volumeFt3"),
    commercialInvoiceNumber: str(formData, "commercialInvoiceNumber"),
    shippingStatus: str(formData, "shippingStatus"),
    project: str(formData, "project"),
    subProject: str(formData, "subProject"),
    notes: str(formData, "notes"),
    poDate: str(formData, "poDate"),
  };
}

export async function createNassauEntry(formData: FormData) {
  await requireDepartmentWrite("compras");

  const values = readEntryValues(formData);
  if (!values.vendor || !values.poNumber) return;

  const [row] = await db
    .insert(nassauMasterFileEntries)
    .values(values)
    .returning({ id: nassauMasterFileEntries.id });

  revalidatePath("/compras/nassau");
  redirect(`/compras/nassau/${row.id}`);
}

export async function updateNassauEntry(id: string, formData: FormData) {
  await requireDepartmentWrite("compras");

  const values = readEntryValues(formData);
  if (!values.vendor || !values.poNumber) return;

  await db
    .update(nassauMasterFileEntries)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(nassauMasterFileEntries.id, id));

  revalidatePath("/compras/nassau");
  revalidatePath(`/compras/nassau/${id}`);
  redirect("/compras/nassau");
}

export async function deleteNassauEntry(id: string) {
  await requireDepartmentWrite("compras");

  const [entry] = await db
    .select({ invoiceFileDriveId: nassauMasterFileEntries.invoiceFileDriveId })
    .from(nassauMasterFileEntries)
    .where(eq(nassauMasterFileEntries.id, id));

  await db.delete(nassauMasterFileEntries).where(eq(nassauMasterFileEntries.id, id));

  if (entry?.invoiceFileDriveId) {
    await deleteNassauFileFromDrive(entry.invoiceFileDriveId);
  }

  revalidatePath("/compras/nassau");
  revalidatePath("/compras/nassau/invoices");
}

export async function uploadNassauEntryInvoice(id: string, formData: FormData) {
  await requireDepartmentWrite("compras");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_FILE_SIZE) return;

  const [entry] = await db
    .select({ vendor: nassauMasterFileEntries.vendor, invoiceNumber: nassauMasterFileEntries.invoiceNumber })
    .from(nassauMasterFileEntries)
    .where(eq(nassauMasterFileEntries.id, id));
  if (!entry) return;

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileName = buildInvoiceFilename(entry.invoiceNumber, file.name);
  const driveId = await uploadNassauInvoiceFile(
    bytes,
    fileName,
    file.type || "application/octet-stream",
    entry.vendor,
  );

  await db
    .update(nassauMasterFileEntries)
    .set({
      invoiceFileDriveId: driveId,
      invoiceFileName: fileName,
      invoiceFileContentType: file.type || "application/octet-stream",
      updatedAt: new Date(),
    })
    .where(eq(nassauMasterFileEntries.id, id));

  revalidatePath("/compras/nassau");
  revalidatePath(`/compras/nassau/${id}`);
  revalidatePath("/compras/nassau/invoices");
}

// Manual trigger for the Compras Nassau page: pulls new Purchase Orders from
// Odoo (their destination project resolved via LOCATION_NAMES) into the
// table.
export async function syncNassauFromOdooAction() {
  await requireDepartmentWrite("compras");
  const result = await syncNassauFromOdoo();

  revalidatePath("/compras/nassau");

  const params = new URLSearchParams();
  params.set("odooSynced", String(result.inserted));
  redirect(`/compras/nassau?${params.toString()}`);
}

// Manual trigger for the review queue: pulls new attachments from the
// Nassau invoice inbox, matching each to an entry by invoice number.
export async function syncNassauInvoiceEmailsAction() {
  await requireDepartmentWrite("compras");
  const result = await syncNassauInvoiceEmails();

  revalidatePath("/compras/nassau/review");

  redirect(`/compras/nassau/review?emailSynced=${result.pendingCreated}`);
}

// Attaches a pending email/manual-upload invoice to the chosen entry (or
// leaves it on the entry the matcher already suggested), then marks the
// match approved. Moves/renames the Drive file as needed so it ends up
// under the right vendor with the confirmed invoice number in its name.
export async function approveNassauInvoiceMatch(matchId: string, formData: FormData) {
  await requireDepartmentWrite("compras");

  const entryId = str(formData, "entryId");
  if (!entryId) return;

  const [match] = await db
    .select()
    .from(nassauInvoiceMatches)
    .where(eq(nassauInvoiceMatches.id, matchId));
  if (!match || match.status !== "pending" || !match.attachmentDriveId) return;

  const [entry] = await db
    .select({
      vendor: nassauMasterFileEntries.vendor,
      invoiceNumber: nassauMasterFileEntries.invoiceNumber,
      invoiceFileDriveId: nassauMasterFileEntries.invoiceFileDriveId,
    })
    .from(nassauMasterFileEntries)
    .where(eq(nassauMasterFileEntries.id, entryId));
  if (!entry) return;

  const finalFilename = buildInvoiceFilename(entry.invoiceNumber, match.attachmentFileName);
  await moveNassauFileToVendorFolder(match.attachmentDriveId, entry.vendor);
  if (finalFilename !== match.attachmentFileName) {
    await renameNassauFileInDrive(match.attachmentDriveId, finalFilename);
  }

  await db
    .update(nassauMasterFileEntries)
    .set({
      invoiceFileDriveId: match.attachmentDriveId,
      invoiceFileName: finalFilename,
      invoiceFileContentType: match.attachmentContentType,
      updatedAt: new Date(),
    })
    .where(eq(nassauMasterFileEntries.id, entryId));

  await db
    .update(nassauInvoiceMatches)
    .set({ status: "approved", resolvedEntryId: entryId, resolvedAt: new Date() })
    .where(eq(nassauInvoiceMatches.id, matchId));

  // If that entry already had a different invoice attached, the old file is
  // no longer needed — remove it so Drive doesn't accumulate stale copies.
  if (entry.invoiceFileDriveId && entry.invoiceFileDriveId !== match.attachmentDriveId) {
    await deleteNassauFileFromDrive(entry.invoiceFileDriveId);
  }

  revalidatePath("/compras/nassau/review");
  revalidatePath("/compras/nassau");
  revalidatePath(`/compras/nassau/${entryId}`);
  revalidatePath("/compras/nassau/invoices");
}

export async function rejectNassauInvoiceMatch(matchId: string) {
  await requireDepartmentWrite("compras");

  const [match] = await db
    .select({ attachmentDriveId: nassauInvoiceMatches.attachmentDriveId, status: nassauInvoiceMatches.status })
    .from(nassauInvoiceMatches)
    .where(eq(nassauInvoiceMatches.id, matchId));
  if (!match || match.status !== "pending") return;

  await db
    .update(nassauInvoiceMatches)
    .set({ status: "rejected", resolvedAt: new Date() })
    .where(eq(nassauInvoiceMatches.id, matchId));

  if (match.attachmentDriveId) {
    await deleteNassauFileFromDrive(match.attachmentDriveId);
  }

  revalidatePath("/compras/nassau/review");
}

const ALLOWED_RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

// Marks the checked outstanding invoices for one credit vendor as paid, and
// optionally stores the accountant's transfer receipt (one PDF/image per
// vendor per payment batch) in Drive, linked from every entry it covers.
export async function markNassauVendorInvoicesPaid(vendor: string, formData: FormData) {
  await requireDepartmentWrite("compras");
  if (!(OUTSTANDING_INVOICE_VENDORS as readonly string[]).includes(vendor)) return;

  const paidOn = str(formData, "paidOn");
  const entryIds = formData.getAll("entryIds").map(String).filter(Boolean);
  if (!paidOn || entryIds.length === 0) return;

  let receiptId: string | null = null;
  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    if (!ALLOWED_RECEIPT_TYPES.has(receipt.type)) return;
    const buffer = Buffer.from(await receipt.arrayBuffer());
    const ext = receipt.name.match(/\.[^.]+$/)?.[0] ?? ".pdf";
    const fileName = receiptFilename(new Date(`${paidOn}T00:00:00`), vendor, ext);
    const driveId = await uploadNassauInvoiceFile(buffer, fileName, receipt.type, vendor);

    const [row] = await db
      .insert(nassauPaymentReceipts)
      .values({ vendor, paidOn, driveId, fileName })
      .returning({ id: nassauPaymentReceipts.id });
    receiptId = row.id;
  }

  await db
    .update(nassauMasterFileEntries)
    .set({
      paymentStatus: "Paid",
      paidOn,
      ...(receiptId ? { paymentReceiptId: receiptId } : {}),
      updatedAt: new Date(),
    })
    .where(and(inArray(nassauMasterFileEntries.id, entryIds), eq(nassauMasterFileEntries.vendor, vendor)));

  revalidatePath("/compras/nassau/outstanding");
  revalidatePath("/compras/nassau");
}

// Same weekly-report email body the source app used. The recipient/CC and
// signature are copied verbatim from the source app (isabel.soto is the
// accountant, "Isa") — this only creates a Gmail DRAFT, nothing is sent
// automatically, so review/edit it in Gmail before sending, and update the
// signature if it should say "Juliana Trujillo" instead of "Valeria
// Restrepo" going forward.
const OUTSTANDING_REPORT_BODY = `Buenos dias Isa,
Espero te encuentres muy bien.

Adjunto los Outstanding Invoices de los proveedores de Nassau y las facturas correspondientes.

Cualquier duda quedo atenta.
Best Regards,
Valeria Restrepo
Procurement Analyst
+1 (786) 898-7199
valeria.restrepo@caybuilding.com
www.caybuilding.com`;

export async function createNassauOutstandingReportDraftAction(formData: FormData) {
  await requireDepartmentWrite("compras");

  const dueDate = str(formData, "dueDate");
  const entryIds = formData.getAll("entryIds").map(String).filter(Boolean);
  if (!dueDate || entryIds.length === 0) {
    redirect("/compras/nassau/outstanding?reportError=1");
  }

  const rows = await db
    .select({ id: nassauMasterFileEntries.id, vendor: nassauMasterFileEntries.vendor })
    .from(nassauMasterFileEntries)
    .where(inArray(nassauMasterFileEntries.id, entryIds));

  const idsByVendor = new Map<string, string[]>();
  for (const row of rows) {
    if (!(OUTSTANDING_INVOICE_VENDORS as readonly string[]).includes(row.vendor)) continue;
    const list = idsByVendor.get(row.vendor) ?? [];
    list.push(row.id);
    idsByVendor.set(row.vendor, list);
  }

  const date = new Date(`${dueDate}T00:00:00`);
  const attachments: DraftAttachment[] = [
    {
      filename: excelFilename(date),
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      content: await buildOutstandingExcelBuffer(entryIds, dueDate),
    },
  ];

  let skippedCount = 0;
  for (const vendor of OUTSTANDING_INVOICE_VENDORS) {
    const vendorIds = idsByVendor.get(vendor);
    if (!vendorIds || vendorIds.length === 0) continue;
    const { buffer, skipped } = await buildVendorInvoicesPdf(vendor, vendorIds);
    attachments.push({ filename: pdfFilename(date, vendor), mimeType: "application/pdf", content: buffer });
    skippedCount += skipped.length;
  }

  await createDraftWithAttachments({
    to: "isabel.soto@caybuilding.com",
    cc: "juliana.trujillo@caybuilding.com",
    subject: emailSubject(date),
    bodyText: OUTSTANDING_REPORT_BODY,
    attachments,
  });

  redirect(`/compras/nassau/outstanding?reportCreated=1&skipped=${skippedCount}`);
}
