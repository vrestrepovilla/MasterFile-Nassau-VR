import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { uploadInvoiceFileToDrive, downloadFileFromDrive, deleteFileFromDrive } from "@/lib/googleDrive";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await pool.query(
    "SELECT invoice_file_name, invoice_file_content_type, invoice_file_data, invoice_file_drive_id FROM master_file_entries WHERE id = $1",
    [id]
  );

  const row = rows[0];
  if (!row || (!row.invoice_file_data && !row.invoice_file_drive_id)) {
    return NextResponse.json({ error: "No hay factura cargada para esta fila." }, { status: 404 });
  }

  const data = row.invoice_file_drive_id
    ? await downloadFileFromDrive(row.invoice_file_drive_id)
    : row.invoice_file_data;

  return new NextResponse(data, {
    headers: {
      "Content-Type": row.invoice_file_content_type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${row.invoice_file_name || "factura"}"`,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "El archivo debe ser PDF o una imagen (JPG, PNG, WEBP, HEIC)." }, { status: 400 });
  }

  const { rows: previous } = await pool.query(
    "SELECT vendor, invoice_file_drive_id FROM master_file_entries WHERE id = $1",
    [id]
  );
  if (previous.length === 0) {
    return NextResponse.json({ error: "Fila no encontrada." }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const driveId = await uploadInvoiceFileToDrive(buffer, file.name, file.type, previous[0].vendor);

  const { rows } = await pool.query(
    `UPDATE master_file_entries
     SET invoice_file_name = $1, invoice_file_content_type = $2, invoice_file_data = NULL, invoice_file_drive_id = $3, updated_at = now()
     WHERE id = $4
     RETURNING id`,
    [file.name, file.type, driveId, id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Fila no encontrada." }, { status: 404 });
  }

  // Si habia un archivo anterior en Drive (se esta reemplazando), lo borramos para no dejar basura.
  if (previous[0].invoice_file_drive_id) {
    await deleteFileFromDrive(previous[0].invoice_file_drive_id);
  }

  return NextResponse.json({ ok: true, fileName: file.name });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { rows: previous } = await pool.query(
    "SELECT invoice_file_drive_id FROM master_file_entries WHERE id = $1",
    [(await params).id]
  );
  const { id } = await params;
  const { rows } = await pool.query(
    `UPDATE master_file_entries
     SET invoice_file_name = NULL, invoice_file_content_type = NULL, invoice_file_data = NULL, invoice_file_drive_id = NULL, updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Fila no encontrada." }, { status: 404 });
  }

  if (previous[0]?.invoice_file_drive_id) {
    await deleteFileFromDrive(previous[0].invoice_file_drive_id);
  }

  return NextResponse.json({ ok: true });
}
