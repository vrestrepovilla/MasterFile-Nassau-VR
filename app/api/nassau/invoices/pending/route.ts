import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(
    `SELECT m.id, m.source, m.from_email, m.subject, m.received_at, m.attachment_filename, m.attachment_content_type,
            m.extracted_invoice_number, m.extracted_vendor, m.extracted_amount, m.suggested_entry_id, m.status,
            e.vendor AS suggested_vendor, e.po_number AS suggested_po_number, e.amount AS suggested_amount
     FROM nassau_invoice_matches m
     LEFT JOIN master_file_entries e ON e.id = m.suggested_entry_id
     WHERE m.status = 'pending'
     ORDER BY m.received_at DESC`
  );

  return NextResponse.json({
    pending: rows.map((r) => ({
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
    })),
  });
}
