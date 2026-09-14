import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { uploadInvoiceFileToDrive } from "@/lib/googleDrive";
import { OUTSTANDING_INVOICE_VENDORS, receiptFilename } from "@/lib/outstandingInvoices";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"]);

// form-data:
//   paidOn: "YYYY-MM-DD"
//   vendors: JSON string [{ vendor, entryIds: string[] }]
//   receipt_<vendor>: archivo opcional, el soporte de pago de ese proveedor
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const paidOn = (form.get("paidOn") as string | null)?.trim();
  const vendorsRaw = form.get("vendors") as string | null;

  if (!paidOn) {
    return NextResponse.json({ error: "La fecha de pago es obligatoria." }, { status: 400 });
  }
  let vendors: { vendor: string; entryIds: string[] }[];
  try {
    vendors = JSON.parse(vendorsRaw ?? "[]");
  } catch {
    return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
  }
  vendors = vendors.filter(
    (v) => (OUTSTANDING_INVOICE_VENDORS as readonly string[]).includes(v.vendor) && v.entryIds?.length > 0
  );
  if (vendors.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una factura." }, { status: 400 });
  }

  let totalUpdated = 0;
  const receiptsCreated: { vendor: string; fileName: string }[] = [];

  for (const { vendor, entryIds } of vendors) {
    let receiptId: string | null = null;

    const file = form.get(`receipt_${vendor}`) as File | null;
    if (file && file.size > 0) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `El soporte de ${vendor} debe ser PDF o imagen (JPG, PNG, WEBP, HEIC).` },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.match(/\.[^.]+$/)?.[0] ?? ".pdf";
      const fileName = receiptFilename(new Date(`${paidOn}T00:00:00`), vendor, ext);
      const driveId = await uploadInvoiceFileToDrive(buffer, fileName, file.type, vendor);

      const { rows } = await pool.query(
        `INSERT INTO nassau_payment_receipts (vendor, paid_on, drive_id, file_name)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [vendor, paidOn, driveId, fileName]
      );
      receiptId = rows[0].id;
      receiptsCreated.push({ vendor, fileName });
    }

    const { rowCount } = await pool.query(
      `UPDATE master_file_entries
       SET payment_status = 'Paid', paid_on = $1, payment_receipt_id = COALESCE($2, payment_receipt_id), updated_at = now()
       WHERE id = ANY($3) AND location = 'nassau' AND vendor = $4`,
      [paidOn, receiptId, entryIds, vendor]
    );
    totalUpdated += rowCount ?? 0;
  }

  return NextResponse.json({ ok: true, updated: totalUpdated, receiptsCreated });
}
