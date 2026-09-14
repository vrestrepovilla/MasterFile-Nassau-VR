import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { uploadInvoiceFileToDrive } from "@/lib/googleDrive";

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"]);

function normalizeInvoiceKey(s: string) {
  return s.replace(/-/g, "").replace(/^0+(?=.)/, "").toLowerCase();
}

// "Invoice #TA3739753.pdf", "Invoice#4720.pdf", "Invoice 1259- Ace.pdf" -> "TA3739753" / "4720" / "1259"
function extractInvoiceNumberFromFilename(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, "");
  const hashIdx = base.lastIndexOf("#");
  if (hashIdx !== -1) {
    let rest = base.slice(hashIdx + 1).trim();
    rest = rest.replace(/\(\d+\)\s*$/, "").trim();
    return rest || null;
  }
  const m = base.match(/Invoic[ed]e?\s+([A-Za-z0-9]+)/i);
  return m ? m[1] : null;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const entryIdField = form.get("entryId");
  const forcedEntryId = typeof entryIdField === "string" && entryIdField.trim() ? entryIdField.trim() : null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "El archivo debe ser PDF o una imagen (JPG, PNG, WEBP, HEIC)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Ya no se usa ningun servicio externo para "leer" la factura (era muy lento) - solo
  // adivinamos el numero de factura del nombre del archivo, si tiene el patron esperado.
  const invoiceNumber = extractInvoiceNumberFromFilename(file.name);

  // Si viene de "Montar Invoice" por renglon, la PO ya se conoce de antemano - no hace falta adivinarla.
  let suggestedEntryId: string | null = forcedEntryId;
  if (!suggestedEntryId && invoiceNumber) {
    const key = normalizeInvoiceKey(invoiceNumber);
    const { rows } = await pool.query<{ id: string; invoice_number: string }>(
      "SELECT id, invoice_number FROM master_file_entries WHERE location = 'nassau' AND invoice_number IS NOT NULL"
    );
    const matches = rows.filter((r) => normalizeInvoiceKey(r.invoice_number.trim()) === key);
    if (matches.length === 1) suggestedEntryId = matches[0].id;
  }

  // Si ya sabemos la PO (y por lo tanto el vendor), subimos directo a su carpeta en Drive de una vez.
  // Si no (por ejemplo, si llegara por correo sin PO asociada), la guardamos temporalmente en la base
  // y se sube a Drive cuando se apruebe y se sepa el vendor.
  let attachmentDriveId: string | null = null;
  let bufferToStore: Buffer | null = buffer;
  if (suggestedEntryId) {
    const { rows: entryRows } = await pool.query<{ vendor: string }>(
      "SELECT vendor FROM master_file_entries WHERE id = $1",
      [suggestedEntryId]
    );
    if (entryRows[0]) {
      attachmentDriveId = await uploadInvoiceFileToDrive(buffer, file.name, file.type, entryRows[0].vendor);
      bufferToStore = null;
    }
  }

  const { rows: inserted } = await pool.query<{ id: string }>(
    `INSERT INTO nassau_invoice_matches
       (source, agentmail_message_id, agentmail_attachment_id, from_email, subject, received_at,
        attachment_filename, attachment_content_type, attachment_data, attachment_drive_id,
        extracted_invoice_number, extracted_vendor, extracted_amount, suggested_entry_id, status)
     VALUES ('manual', $1, $2, 'manual-upload', 'Factura subida manualmente', now(),
             $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
     RETURNING id`,
    [
      `manual:${randomUUID()}`,
      `manual:${randomUUID()}`,
      file.name,
      file.type,
      bufferToStore,
      attachmentDriveId,
      invoiceNumber,
      null,
      null,
      suggestedEntryId,
    ]
  );

  const { rows: fullRows } = await pool.query(
    `SELECT m.id, m.source, m.from_email, m.subject, m.received_at, m.attachment_filename, m.attachment_content_type,
            m.extracted_invoice_number, m.extracted_vendor, m.extracted_amount, m.suggested_entry_id,
            e.vendor AS suggested_vendor, e.po_number AS suggested_po_number, e.amount AS suggested_amount
     FROM nassau_invoice_matches m
     LEFT JOIN master_file_entries e ON e.id = m.suggested_entry_id
     WHERE m.id = $1`,
    [inserted[0].id]
  );
  const r = fullRows[0];

  return NextResponse.json({
    ok: true,
    match: {
      id: r.id,
      source: r.source,
      fromEmail: r.from_email,
      subject: r.subject,
      receivedAt: r.received_at,
      attachmentFilename: r.attachment_filename,
      attachmentContentType: r.attachment_content_type,
      extractedInvoiceNumber: r.extracted_invoice_number,
      extractedVendor: r.extracted_vendor,
      extractedAmount: r.extracted_amount != null ? Number(r.extracted_amount) : null,
      suggestedEntryId: r.suggested_entry_id,
      suggestedVendor: r.suggested_vendor,
      suggestedPoNumber: r.suggested_po_number,
      suggestedAmount: r.suggested_amount != null ? Number(r.suggested_amount) : null,
    },
  });
}
