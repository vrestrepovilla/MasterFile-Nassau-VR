// One-off: migrates real Nassau data from the legacy MasterFile-Nassau-VR
// Postgres database into this app's own DB (new nassau_* tables). Preserves
// UUIDs exactly so foreign keys (payment_receipt_id, suggested/resolved_entry_id)
// stay intact across the copy.
//
// Only location='nassau' rows are copied from master_file_entries —
// location='us' rows are confirmed placeholder/demo data (vendor/project
// names like "ABC Supply Co." / "Coral Ridge Plaza" that don't match any
// real Cay Building vendor or project seen elsewhere in this app).
//
// purchase_requests/purchase_orders are NOT migrated: only 1-2 rows exist in
// the source at all, and zero nassau-location master_file_entries reference
// a purchase_order_id — they're leftover test artifacts, not real data.
//
// invoice_file_data / attachment_data (legacy bytea blobs) are NOT migrated:
// confirmed zero rows have bytea data without a drive_id already set, so
// every real file already lives in Drive.
import { Client } from "pg";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}="?([^"\n]+)"?`, "m"))?.[1];

const source = new Client({ connectionString: get("NASSAU_LEGACY_DATABASE_URL") });
const target = new Client({ connectionString: get("DATABASE_URL") });
await source.connect();
await target.connect();

// --- nassau_payment_receipts (no FKs in, referenced by master_file_entries) ---
const { rows: receipts } = await source.query(`
  SELECT id, vendor, paid_on, drive_id, file_name, created_at FROM nassau_payment_receipts
`);
for (const r of receipts) {
  await target.query(
    `INSERT INTO nassau_payment_receipts (id, vendor, paid_on, drive_id, file_name, created_at)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
    [r.id, r.vendor, r.paid_on, r.drive_id, r.file_name, r.created_at],
  );
}
console.log("nassau_payment_receipts: copied", receipts.length, "rows");

// --- nassau_master_file_entries (location='nassau' only) ---
const { rows: entries } = await source.query(`
  SELECT id, vendor, account, invoice_number, po_number, amount, payment_status, due_date,
         paid_on, payment_method, freight_lead_time, freight_cost, wr_number, received_on,
         weight_lb, volume_ft3, commercial_invoice_number, shipping_status, project,
         sub_project, notes, location, invoice_file_name, invoice_file_content_type,
         invoice_file_drive_id, payment_receipt_id, po_date, created_at, updated_at
  FROM master_file_entries WHERE location = 'nassau'
`);
for (const e of entries) {
  await target.query(
    `INSERT INTO nassau_master_file_entries
       (id, vendor, account, invoice_number, po_number, amount, payment_status, due_date,
        paid_on, payment_method, freight_lead_time, freight_cost, wr_number, received_on,
        weight_lb, volume_ft3, commercial_invoice_number, shipping_status, project,
        sub_project, notes, location, invoice_file_name, invoice_file_content_type,
        invoice_file_drive_id, payment_receipt_id, po_date, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
     ON CONFLICT (id) DO NOTHING`,
    [
      e.id, e.vendor, e.account, e.invoice_number, e.po_number, e.amount, e.payment_status,
      e.due_date, e.paid_on, e.payment_method, e.freight_lead_time, e.freight_cost,
      e.wr_number, e.received_on, e.weight_lb, e.volume_ft3, e.commercial_invoice_number,
      e.shipping_status, e.project, e.sub_project, e.notes, e.location, e.invoice_file_name,
      e.invoice_file_content_type, e.invoice_file_drive_id, e.payment_receipt_id, e.po_date,
      e.created_at, e.updated_at,
    ],
  );
}
console.log("nassau_master_file_entries: copied", entries.length, "rows");

// --- nassau_invoice_matches ---
const { rows: matches } = await source.query(`
  SELECT id, source, agentmail_message_id, agentmail_attachment_id, from_email, subject,
         received_at, attachment_filename, attachment_content_type, attachment_drive_id,
         extracted_invoice_number, extracted_vendor, extracted_amount, suggested_entry_id,
         status, resolved_entry_id, resolved_at, created_at
  FROM nassau_invoice_matches
`);
for (const m of matches) {
  await target.query(
    `INSERT INTO nassau_invoice_matches
       (id, source, agentmail_message_id, agentmail_attachment_id, from_email, subject,
        received_at, attachment_file_name, attachment_content_type, attachment_drive_id,
        extracted_invoice_number, extracted_vendor, extracted_amount, suggested_entry_id,
        status, resolved_entry_id, resolved_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (id) DO NOTHING`,
    [
      m.id, m.source, m.agentmail_message_id, m.agentmail_attachment_id, m.from_email,
      m.subject, m.received_at, m.attachment_filename, m.attachment_content_type,
      m.attachment_drive_id, m.extracted_invoice_number, m.extracted_vendor,
      m.extracted_amount, m.suggested_entry_id, m.status, m.resolved_entry_id,
      m.resolved_at, m.created_at,
    ],
  );
}
console.log("nassau_invoice_matches: copied", matches.length, "rows");

await source.end();
await target.end();
