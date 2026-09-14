import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { parseMasterFileInput, parseMasterFilePatch, rowToMasterFileEntry } from "@/lib/masterFile";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch = parseMasterFilePatch(body);
  if ("error" in patch) {
    return NextResponse.json({ error: patch.error }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE master_file_entries SET ${patch.column} = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [patch.value, id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Fila no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ entry: rowToMasterFileEntry(rows[0]) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const input = parseMasterFileInput(body);
  if ("error" in input) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE master_file_entries SET
       vendor = $1, account = $2, invoice_number = $3, po_number = $4, amount = $5,
       payment_status = $6, due_date = $7, paid_on = $8, payment_method = $9,
       freight_lead_time = $10, freight_cost = $11, wr_number = $12, received_on = $13,
       weight_lb = $14, volume_ft3 = $15, commercial_invoice_number = $16,
       shipping_status = $17, project = $18, sub_project = $19, notes = $20,
       location = $21, updated_at = now()
     WHERE id = $22
     RETURNING *`,
    [
      input.vendor,
      input.account,
      input.invoiceNumber,
      input.poNumber,
      input.amount,
      input.paymentStatus,
      input.dueDate,
      input.paidOn,
      input.paymentMethod,
      input.freightLeadTime,
      input.freightCost,
      input.wrNumber,
      input.receivedOn,
      input.weightLb,
      input.volumeFt3,
      input.commercialInvoiceNumber,
      input.shippingStatus,
      input.project,
      input.subProject,
      input.notes,
      input.location,
      id,
    ]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Fila no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ entry: rowToMasterFileEntry(rows[0]) });
}
