import { NextRequest, NextResponse } from "next/server";
import { buildOutstandingExcelBuffer, buildVendorInvoicesPdf } from "@/lib/outstandingReport";
import { OUTSTANDING_INVOICE_VENDORS, emailSubject, excelFilename, pdfFilename } from "@/lib/outstandingInvoices";
import { createDraftWithAttachments, type DraftAttachment } from "@/lib/gmail";

const BODY_TEXT = `Buenos dias Isa,
Espero te encuentres muy bien.

Adjunto los Outstanding Invoices de los proveedores de Nassau y las facturas correspondientes.

Cualquier duda quedo atenta.
Best Regards,
Valeria Restrepo
Procurement Analyst
+1 (786) 898-7199
valeria.restrepo@caybuilding.com
www.caybuilding.com`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const dueDate = typeof body.dueDate === "string" && body.dueDate.trim() ? body.dueDate.trim() : null;
  const byVendor = Array.isArray(body.byVendor) ? body.byVendor : [];

  if (!dueDate) {
    return NextResponse.json({ error: "La fecha de pago es obligatoria." }, { status: 400 });
  }

  const allEntryIds: string[] = byVendor.flatMap((v: { entryIds: string[] }) => v.entryIds ?? []);
  if (allEntryIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una factura." }, { status: 400 });
  }

  const date = new Date(`${dueDate}T00:00:00`);
  const attachments: DraftAttachment[] = [];
  const skippedByVendor: Record<string, string[]> = {};

  const excelBuffer = await buildOutstandingExcelBuffer(allEntryIds, dueDate);
  attachments.push({
    filename: excelFilename(date),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    content: excelBuffer,
  });

  for (const { vendor, entryIds } of byVendor as { vendor: string; entryIds: string[] }[]) {
    if (!(OUTSTANDING_INVOICE_VENDORS as readonly string[]).includes(vendor)) continue;
    if (!entryIds || entryIds.length === 0) continue;
    const { buffer, skipped } = await buildVendorInvoicesPdf(vendor, entryIds);
    attachments.push({ filename: pdfFilename(date, vendor), mimeType: "application/pdf", content: buffer });
    if (skipped.length > 0) skippedByVendor[vendor] = skipped;
  }

  const draftId = await createDraftWithAttachments({
    to: "isabel.soto@caybuilding.com",
    cc: "juliana.trujillo@caybuilding.com",
    subject: emailSubject(date),
    bodyText: BODY_TEXT,
    attachments,
  });

  return NextResponse.json({ ok: true, draftId, skippedByVendor });
}
