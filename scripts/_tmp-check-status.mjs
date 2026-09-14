import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: "C:\\Users\\valer\\OneDrive\\Desktop\\Cargo Cay Building\\.env.local" });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

for (const vendor of ["Paint Suppliers", "Premier Importers"]) {
  const { rows } = await pool.query(
    `SELECT po_number, invoice_number, amount, payment_status, paid_on
     FROM master_file_entries
     WHERE location = 'nassau' AND vendor = $1
     ORDER BY po_number`,
    [vendor]
  );
  console.log(`\n=== ${vendor} ===`);
  console.table(rows);
}
await pool.end();
