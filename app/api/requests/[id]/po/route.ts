import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params;
  const form = await req.formData();

  const poNumber = (form.get("poNumber") as string | null)?.trim();
  const vendor = (form.get("vendor") as string | null)?.trim();
  const project = (form.get("project") as string | null)?.trim() || null;
  const subProject = (form.get("subProject") as string | null)?.trim() || null;
  const notes = (form.get("notes") as string | null)?.trim() || null;
  const file = form.get("file") as File | null;

  if (!poNumber) {
    return NextResponse.json({ error: "El numero de PO es obligatorio." }, { status: 400 });
  }
  if (!vendor) {
    return NextResponse.json({ error: "El vendor es obligatorio." }, { status: 400 });
  }

  let pdfFilename: string | null = null;
  let pdfContentType: string | null = null;
  let pdfBuffer: Buffer | null = null;

  if (file && file.size > 0) {
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "El archivo debe ser un PDF." }, { status: 400 });
    }
    pdfFilename = file.name;
    pdfContentType = file.type;
    pdfBuffer = Buffer.from(await file.arrayBuffer());
  }

  const { rows: reqRows } = await pool.query("SELECT id FROM purchase_requests WHERE id = $1", [requestId]);
  if (reqRows.length === 0) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  let poId: string;
  if (pdfBuffer) {
    const { rows } = await pool.query(
      `INSERT INTO purchase_orders (request_id, po_number, notes, pdf_filename, pdf_content_type, pdf_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (request_id) DO UPDATE SET
         po_number = EXCLUDED.po_number,
         notes = EXCLUDED.notes,
         pdf_filename = EXCLUDED.pdf_filename,
         pdf_content_type = EXCLUDED.pdf_content_type,
         pdf_data = EXCLUDED.pdf_data,
         updated_at = now()
       RETURNING id`,
      [requestId, poNumber, notes, pdfFilename, pdfContentType, pdfBuffer]
    );
    poId = rows[0].id;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO purchase_orders (request_id, po_number, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (request_id) DO UPDATE SET
         po_number = EXCLUDED.po_number,
         notes = EXCLUDED.notes,
         updated_at = now()
       RETURNING id`,
      [requestId, poNumber, notes]
    );
    poId = rows[0].id;
  }

  await pool.query(
    `INSERT INTO master_file_entries (purchase_order_id, vendor, po_number, project, sub_project)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (purchase_order_id) DO UPDATE SET
       vendor = EXCLUDED.vendor,
       po_number = EXCLUDED.po_number,
       project = EXCLUDED.project,
       sub_project = EXCLUDED.sub_project,
       updated_at = now()`,
    [poId, vendor, poNumber, project, subProject]
  );

  return NextResponse.json({ ok: true });
}
