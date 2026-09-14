import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { deleteFileFromDrive } from "@/lib/googleDrive";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await pool.query(
    `UPDATE nassau_invoice_matches
     SET status = 'rejected', resolved_at = now(), attachment_data = NULL
     WHERE id = $1 AND status = 'pending'
     RETURNING id, attachment_drive_id`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Factura pendiente no encontrada o ya resuelta." }, { status: 404 });
  }

  // Si ya se habia subido a Drive (porque la PO se conocia de antemano), la borramos - no se necesita.
  if (rows[0].attachment_drive_id) {
    await deleteFileFromDrive(rows[0].attachment_drive_id);
  }

  return NextResponse.json({ ok: true });
}
