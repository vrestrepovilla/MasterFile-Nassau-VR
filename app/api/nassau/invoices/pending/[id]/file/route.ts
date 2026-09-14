import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { downloadFileFromDrive } from "@/lib/googleDrive";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await pool.query(
    "SELECT attachment_filename, attachment_content_type, attachment_data, attachment_drive_id FROM nassau_invoice_matches WHERE id = $1",
    [id]
  );

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const data = row.attachment_drive_id
    ? await downloadFileFromDrive(row.attachment_drive_id)
    : row.attachment_data;

  return new NextResponse(data, {
    headers: {
      "Content-Type": row.attachment_content_type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${row.attachment_filename || "factura"}"`,
    },
  });
}
