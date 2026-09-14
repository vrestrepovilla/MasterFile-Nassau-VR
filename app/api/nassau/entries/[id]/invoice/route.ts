import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { nassauMasterFileEntries } from "@/lib/db/schema";
import { downloadNassauFileFromDrive } from "@/lib/nassau/google-drive";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { id } = await params;

  const [entry] = await db
    .select({ invoiceFileDriveId: nassauMasterFileEntries.invoiceFileDriveId })
    .from(nassauMasterFileEntries)
    .where(eq(nassauMasterFileEntries.id, id));

  if (!entry?.invoiceFileDriveId) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const { bytes, mimeType, fileName } = await downloadNassauFileFromDrive(entry.invoiceFileDriveId);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=0, no-cache",
    },
  });
}
