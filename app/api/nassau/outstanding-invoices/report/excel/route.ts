import { NextRequest, NextResponse } from "next/server";
import { buildOutstandingExcelBuffer } from "@/lib/outstandingReport";
import { excelFilename } from "@/lib/outstandingInvoices";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entryIds = searchParams.get("entryIds")?.split(",").filter(Boolean) ?? [];
  const dueDate = searchParams.get("dueDate");

  if (entryIds.length === 0) {
    return NextResponse.json({ error: "No hay facturas seleccionadas." }, { status: 400 });
  }

  const buffer = await buildOutstandingExcelBuffer(entryIds, dueDate);
  const filename = excelFilename(dueDate ? new Date(`${dueDate}T00:00:00`) : new Date());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
