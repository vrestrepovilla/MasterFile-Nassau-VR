import { pool } from "@/lib/db";
import { MASTER_FILE_LIST_COLUMNS, rowToMasterFileEntry } from "@/lib/masterFile";
import InvoicesBrowser from "@/app/components/InvoicesBrowser";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const { rows } = await pool.query(
    `SELECT ${MASTER_FILE_LIST_COLUMNS} FROM master_file_entries WHERE location = 'us' ORDER BY vendor, po_number DESC`
  );
  const entries = rows.map(rowToMasterFileEntry);
  return <InvoicesBrowser entries={entries} title="Invoices" />;
}
