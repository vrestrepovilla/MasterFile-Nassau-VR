import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { OUTSTANDING_INVOICE_VENDORS } from "@/lib/outstandingInvoices";

// Guarda la fecha de pago ("Due Date") elegida para esta tanda en cada fila incluida - asi queda
// visible en el Master File tambien, no solo en el reporte.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const dueDate = typeof body.dueDate === "string" && body.dueDate.trim() ? body.dueDate.trim() : null;
  const entryIds = Array.isArray(body.entryIds) ? body.entryIds.filter((x: unknown) => typeof x === "string") : [];

  if (!dueDate) {
    return NextResponse.json({ error: "La fecha de pago es obligatoria." }, { status: 400 });
  }
  if (entryIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una factura." }, { status: 400 });
  }

  const { rowCount } = await pool.query(
    `UPDATE master_file_entries
     SET due_date = $1, updated_at = now()
     WHERE id = ANY($2) AND location = 'nassau' AND vendor = ANY($3)`,
    [dueDate, entryIds, OUTSTANDING_INVOICE_VENDORS]
  );

  return NextResponse.json({ ok: true, updated: rowCount });
}
