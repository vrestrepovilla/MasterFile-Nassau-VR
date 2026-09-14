import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await pool.query(
    "SELECT pdf_filename, pdf_content_type, pdf_data FROM purchase_orders WHERE id = $1",
    [id]
  );

  const row = rows[0];
  if (!row || !row.pdf_data) {
    return NextResponse.json({ error: "No hay PDF para esta PO." }, { status: 404 });
  }

  return new NextResponse(row.pdf_data, {
    headers: {
      "Content-Type": row.pdf_content_type || "application/pdf",
      "Content-Disposition": `inline; filename="${row.pdf_filename || "po.pdf"}"`,
    },
  });
}
