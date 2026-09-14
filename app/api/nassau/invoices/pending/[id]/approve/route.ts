import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { uploadInvoiceFileToDrive, deleteFileFromDrive, renameFileInDrive, buildInvoiceFilename } from "@/lib/googleDrive";

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function num(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const createNew = body.createNew === true;
  const entryId = typeof body.entryId === "string" ? body.entryId : null;
  const invoiceNumber = str(body.invoiceNumber);
  const amount = num(body.amount);
  const paymentStatus = str(body.paymentStatus);
  const paidOn = str(body.paidOn);
  const paymentMethod = str(body.paymentMethod);

  if (!createNew && !entryId) {
    return NextResponse.json({ error: "Debes indicar a que PO se asocia la factura, o crear una fila nueva." }, { status: 400 });
  }
  if (createNew) {
    const vendor = str(body.vendor);
    const poNumber = str(body.poNumber);
    if (!vendor) return NextResponse.json({ error: "El vendor es obligatorio para crear la fila." }, { status: 400 });
    if (!poNumber) return NextResponse.json({ error: "El numero de PO es obligatorio para crear la fila." }, { status: 400 });
  }

  const { rows: matchRows } = await pool.query(
    "SELECT attachment_filename, attachment_content_type, attachment_data, attachment_drive_id, status FROM nassau_invoice_matches WHERE id = $1",
    [id]
  );
  const match = matchRows[0];
  if (!match) {
    return NextResponse.json({ error: "Factura pendiente no encontrada." }, { status: 404 });
  }
  if (match.status !== "pending") {
    return NextResponse.json({ error: "Esta factura ya fue resuelta." }, { status: 409 });
  }

  let existingEntryVendor: string | null = null;
  let existingEntryDriveId: string | null = null;
  if (!createNew) {
    const { rows } = await pool.query(
      "SELECT vendor, invoice_file_drive_id FROM master_file_entries WHERE id = $1 AND location = 'nassau'",
      [entryId]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "La PO seleccionada no existe." }, { status: 400 });
    }
    existingEntryVendor = rows[0].vendor;
    existingEntryDriveId = rows[0].invoice_file_drive_id;
  }

  // El nombre final se decide aqui, con el numero de factura ya confirmado - no con el que traia
  // el archivo del computador. Coincide con el formato que ya usan casi todas las carpetas de Drive.
  const finalFilename = buildInvoiceFilename(invoiceNumber, match.attachment_filename);

  // El archivo ya puede estar en Drive (si al subirlo ya sabiamos la PO/vendor). Si no, lo subimos
  // ahora que ya sabemos a que vendor corresponde.
  let driveId: string | null = match.attachment_drive_id;
  if (!driveId) {
    const vendor = createNew ? str(body.vendor)! : existingEntryVendor!;
    driveId = await uploadInvoiceFileToDrive(
      match.attachment_data,
      finalFilename,
      match.attachment_content_type,
      vendor
    );
  } else if (finalFilename !== match.attachment_filename) {
    await renameFileInDrive(driveId, finalFilename);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: lockRows } = await client.query(
      "SELECT status FROM nassau_invoice_matches WHERE id = $1 FOR UPDATE",
      [id]
    );
    if (lockRows.length === 0 || lockRows[0].status !== "pending") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Esta factura ya fue resuelta." }, { status: 409 });
    }

    let resolvedEntryId: string;

    if (createNew) {
      const vendor = str(body.vendor)!;
      const poNumber = str(body.poNumber)!;
      const { rows } = await client.query(
        `INSERT INTO master_file_entries
           (vendor, po_number, invoice_number, amount, payment_status, paid_on, payment_method,
            location, invoice_file_name, invoice_file_content_type, invoice_file_drive_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'nassau', $8, $9, $10)
         RETURNING id`,
        [
          vendor,
          poNumber,
          invoiceNumber,
          amount,
          paymentStatus,
          paidOn,
          paymentMethod,
          finalFilename,
          match.attachment_content_type,
          driveId,
        ]
      );
      resolvedEntryId = rows[0].id;
    } else {
      await client.query(
        `UPDATE master_file_entries
         SET invoice_file_name = $1, invoice_file_content_type = $2, invoice_file_data = NULL, invoice_file_drive_id = $3,
             invoice_number = COALESCE($4, invoice_number), amount = COALESCE($5, amount),
             payment_status = COALESCE($6, payment_status),
             paid_on = COALESCE($7, paid_on),
             payment_method = COALESCE($8, payment_method),
             updated_at = now()
         WHERE id = $9`,
        [
          finalFilename,
          match.attachment_content_type,
          driveId,
          invoiceNumber,
          amount,
          paymentStatus,
          paidOn,
          paymentMethod,
          entryId,
        ]
      );
      resolvedEntryId = entryId!;
    }

    await client.query(
      `UPDATE nassau_invoice_matches
       SET status = 'approved', resolved_entry_id = $1, resolved_at = now(), attachment_data = NULL
       WHERE id = $2`,
      [resolvedEntryId, id]
    );

    await client.query("COMMIT");

    // Si la PO ya tenia una factura distinta adjunta, borramos la vieja de Drive para no dejar basura.
    if (existingEntryDriveId && existingEntryDriveId !== driveId) {
      await deleteFileFromDrive(existingEntryDriveId);
    }

    return NextResponse.json({ ok: true, entryId: resolvedEntryId });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo aprobar la factura." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
