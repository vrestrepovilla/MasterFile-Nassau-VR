import { NextRequest, NextResponse } from "next/server";
import { buildVendorInvoicesPdf } from "@/lib/outstandingReport";
import { OUTSTANDING_INVOICE_VENDORS, pdfFilename } from "@/lib/outstandingInvoices";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendor = searchParams.get("vendor");
  const entryIds = searchParams.get("entryIds")?.split(",").filter(Boolean) ?? [];
  const dueDate = searchParams.get("dueDate");

  if (!vendor || !(OUTSTANDING_INVOICE_VENDORS as readonly string[]).includes(vendor)) {
    return NextResponse.json({ error: "Vendor invalido." }, { status: 400 });
  }
  if (entryIds.length === 0) {
    return NextResponse.json({ error: "No hay facturas seleccionadas." }, { status: 400 });
  }

  const { buffer, skipped } = await buildVendorInvoicesPdf(vendor, entryIds);
  const filename = pdfFilename(dueDate ? new Date(`${dueDate}T00:00:00`) : new Date(), vendor);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Skipped-Files": encodeURIComponent(skipped.join(", ")),
    },
  });
}
