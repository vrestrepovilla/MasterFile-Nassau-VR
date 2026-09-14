import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brokerInvoices } from "@/lib/db/schema";

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
    .select()
    .from(brokerInvoices)
    .where(eq(brokerInvoices.id, invoiceId));

  if (!invoice) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const bytes = Buffer.from(invoice.fileData, "base64");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": invoice.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(invoice.fileName)}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=0, no-cache",
    },
  });
}
