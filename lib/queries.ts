import { pool } from "@/lib/db";
import type { PurchaseRequest } from "@/lib/types";

function toIso(value: unknown): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : (value as string);
}

export async function getPurchaseRequests(): Promise<PurchaseRequest[]> {
  const { rows } = await pool.query(`
    SELECT
      r.id,
      r.from_email,
      r.subject,
      r.body_text,
      r.received_at,
      po.id AS po_id,
      po.po_number,
      po.notes AS po_notes,
      po.pdf_filename,
      po.created_at AS po_created_at,
      mfe.vendor AS mfe_vendor,
      mfe.project AS mfe_project,
      mfe.sub_project AS mfe_sub_project
    FROM purchase_requests r
    LEFT JOIN purchase_orders po ON po.request_id = r.id
    LEFT JOIN master_file_entries mfe ON mfe.purchase_order_id = po.id
    ORDER BY r.received_at DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    fromEmail: row.from_email,
    subject: row.subject,
    bodyText: row.body_text,
    receivedAt: toIso(row.received_at) as string,
    purchaseOrder: row.po_id
      ? {
          id: row.po_id,
          poNumber: row.po_number,
          notes: row.po_notes,
          pdfFilename: row.pdf_filename,
          createdAt: toIso(row.po_created_at) as string,
          vendor: row.mfe_vendor,
          project: row.mfe_project,
          subProject: row.mfe_sub_project,
        }
      : null,
  }));
}
