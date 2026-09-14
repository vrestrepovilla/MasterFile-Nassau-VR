import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { buildOutstandingExcelBuffer, buildVendorInvoicesPdf } from "@/lib/outstandingReport";
import { OUTSTANDING_INVOICE_VENDORS, excelFilename, pdfFilename, shortDateStamp } from "@/lib/outstandingInvoices";

// Junta el Excel + un PDF por proveedor en un solo .zip - los navegadores bloquean varias
// descargas automaticas seguidas, asi que mandamos todo en un solo archivo.
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
  const zip = new JSZip();

  const excelBuffer = await buildOutstandingExcelBuffer(allEntryIds, dueDate);
  zip.file(excelFilename(date), excelBuffer);

  for (const { vendor, entryIds } of byVendor as { vendor: string; entryIds: string[] }[]) {
    if (!(OUTSTANDING_INVOICE_VENDORS as readonly string[]).includes(vendor)) continue;
    if (!entryIds || entryIds.length === 0) continue;
    const { buffer } = await buildVendorInvoicesPdf(vendor, entryIds);
    zip.file(pdfFilename(date, vendor), buffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${shortDateStamp(date)} Outstanding Invoices Nassau.zip"`,
    },
  });
}
