import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { MASTER_FILE_LIST_COLUMNS, parseMasterFileInput, rowToMasterFileEntry } from "@/lib/masterFile";

export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get("location") === "nassau" ? "nassau" : "us";
  const { rows } = await pool.query(
    `SELECT ${MASTER_FILE_LIST_COLUMNS} FROM master_file_entries WHERE location = $1 ORDER BY created_at DESC`,
    [location]
  );
  return NextResponse.json({ entries: rows.map(rowToMasterFileEntry) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const input = parseMasterFileInput(body);
  if ("error" in input) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO master_file_entries
       (vendor, account, invoice_number, po_number, amount, payment_status, due_date, paid_on,
        payment_method, freight_lead_time, freight_cost, wr_number, received_on, weight_lb,
        volume_ft3, commercial_invoice_number, shipping_status, project, sub_project, notes, location)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
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
    ]
  );

  return NextResponse.json({ entry: rowToMasterFileEntry(rows[0]) });
}
