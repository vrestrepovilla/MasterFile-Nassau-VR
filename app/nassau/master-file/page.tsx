import { pool } from "@/lib/db";
import { MASTER_FILE_LIST_COLUMNS, rowToMasterFileEntry } from "@/lib/masterFile";
import MasterFileDashboard from "@/app/components/MasterFileDashboard";

export const dynamic = "force-dynamic";

export default async function NassauMasterFilePage() {
  const { rows } = await pool.query(
    `SELECT ${MASTER_FILE_LIST_COLUMNS} FROM master_file_entries WHERE location = 'nassau' ORDER BY created_at DESC`
  );
  const entries = rows.map(rowToMasterFileEntry);
  return <MasterFileDashboard initialEntries={entries} location="nassau" title="Master File — Nassau" />;
}
