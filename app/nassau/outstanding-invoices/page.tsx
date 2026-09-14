import { pool } from "@/lib/db";
import { rowToMasterFileEntry } from "@/lib/masterFile";
import { OUTSTANDING_INVOICE_VENDORS, sortByInvoiceNumber } from "@/lib/outstandingInvoices";
import OutstandingInvoicesDashboard from "@/app/components/OutstandingInvoicesDashboard";

export const dynamic = "force-dynamic";

export default async function OutstandingInvoicesPage() {
  const { rows } = await pool.query(
    `SELECT id, vendor, account, invoice_number, po_number, amount, payment_status, due_date, paid_on,
            payment_method, project, sub_project, notes, location, invoice_file_name,
            invoice_file_content_type, created_at, updated_at
     FROM master_file_entries
     WHERE location = 'nassau'
       AND vendor = ANY($1)
       AND (payment_status IS NULL OR payment_status NOT IN ('Paid', 'Cancelled'))`,
    [OUTSTANDING_INVOICE_VENDORS]
  );

  const entries = rows.map(rowToMasterFileEntry);
  const byVendor = OUTSTANDING_INVOICE_VENDORS.map((vendor) => ({
    vendor,
    entries: sortByInvoiceNumber(entries.filter((e) => e.vendor === vendor)),
  }));

  return <OutstandingInvoicesDashboard initialByVendor={byVendor} />;
}
