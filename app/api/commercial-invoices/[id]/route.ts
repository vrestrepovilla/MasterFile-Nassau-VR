import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { commercialInvoices } from "@/lib/db/schema";
import { downloadFromDrive } from "@/lib/google-drive";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isFinite(invoiceId)) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const [invoice] = await db
    .select({
      blobUrl: commercialInvoices.blobUrl,
      driveFileId: commercialInvoices.driveFileId,
    })
    .from(commercialInvoices)
    .where(eq(commercialInvoices.id, invoiceId));

  if (!invoice) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  if (invoice.driveFileId) {
    const { bytes, mimeType, fileName } = await downloadFromDrive(invoice.driveFileId);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  }

  if (invoice.blobUrl) {
    return NextResponse.redirect(invoice.blobUrl);
  }

  return new NextResponse("No encontrado", { status: 404 });
}
