import { pool } from "@/lib/db";
import { MASTER_FILE_LIST_COLUMNS, rowToMasterFileEntry } from "@/lib/masterFile";
import InvoicesBrowser from "@/app/components/InvoicesBrowser";

export const dynamic = "force-dynamic";

export default async function NassauInvoicesPage() {
  const { rows } = await pool.query(
    `SELECT ${MASTER_FILE_LIST_COLUMNS} FROM master_file_entries WHERE location = 'nassau' ORDER BY vendor, po_number DESC`
  );
  const entries = rows.map(rowToMasterFileEntry);
  const { rows: vendorRows } = await pool.query<{ name: string }>("SELECT name FROM nassau_vendors ORDER BY name");
  const extraVendors = vendorRows.map((r) => r.name);
  return (
    <InvoicesBrowser
      entries={entries}
      title="Invoices — Nassau"
      location="nassau"
      showPendingReview
      extraVendors={extraVendors}
    />
  );
}
