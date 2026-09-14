// Migra los archivos de factura que ya estan guardados en Postgres (invoice_file_data) hacia
// Google Drive (carpeta Vendors/<Proveedor>/), fila por fila, vaciando cada columna a medida que
// se sube para no volver a llenar la base de datos. Se puede correr varias veces sin problema:
// solo procesa las filas que todavia no tienen invoice_file_drive_id.
//
// Uso: node scripts/migrate-invoices-to-drive.mjs

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import pg from "pg";
import { google } from "googleapis";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const { GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, GOOGLE_DRIVE_VENDORS_FOLDER_ID } =
  process.env;
if (!GOOGLE_DRIVE_CLIENT_ID || !GOOGLE_DRIVE_CLIENT_SECRET || !GOOGLE_DRIVE_REFRESH_TOKEN || !GOOGLE_DRIVE_VENDORS_FOLDER_ID) {
  console.error("Faltan credenciales de Google Drive en .env.local");
  process.exit(1);
}

const auth = new google.auth.OAuth2(GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
const drive = google.drive({ version: "v3", auth });

const vendorFolderCache = new Map();

function escapeForQuery(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findOrCreateVendorFolder(vendorName) {
  const key = vendorName.trim().toLowerCase();
  if (vendorFolderCache.has(key)) return vendorFolderCache.get(key);

  const name = escapeForQuery(vendorName.trim());
  const res = await drive.files.list({
    q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and '${GOOGLE_DRIVE_VENDORS_FOLDER_ID}' in parents and trashed = false`,
    fields: "files(id, name)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    corpora: "allDrives",
  });
  let folderId = res.data.files?.[0]?.id;
  if (!folderId) {
    const created = await drive.files.create({
      requestBody: {
        name: vendorName.trim(),
        mimeType: "application/vnd.google-apps.folder",
        parents: [GOOGLE_DRIVE_VENDORS_FOLDER_ID],
      },
      fields: "id",
      supportsAllDrives: true,
    });
    folderId = created.data.id;
  }
  vendorFolderCache.set(key, folderId);
  return folderId;
}

async function uploadToVendorFolder(buffer, filename, mimeType, vendorName) {
  const folderId = await findOrCreateVendorFolder(vendorName);
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
    supportsAllDrives: true,
  });
  return res.data.id;
}

async function main() {
  const { rows } = await pool.query(
    `SELECT id, vendor, invoice_file_name, invoice_file_content_type, invoice_file_data
     FROM master_file_entries
     WHERE invoice_file_data IS NOT NULL AND invoice_file_drive_id IS NULL
     ORDER BY created_at ASC`
  );
  console.log(`Filas a migrar: ${rows.length}`);

  let migrated = 0;
  let failed = 0;

  for (const [i, row] of rows.entries()) {
    try {
      const driveId = await uploadToVendorFolder(
        row.invoice_file_data,
        row.invoice_file_name || `factura-${row.id}.pdf`,
        row.invoice_file_content_type || "application/octet-stream",
        row.vendor
      );
      await pool.query(
        "UPDATE master_file_entries SET invoice_file_data = NULL, invoice_file_drive_id = $1 WHERE id = $2",
        [driveId, row.id]
      );
      migrated += 1;
      console.log(`[${i + 1}/${rows.length}] OK: ${row.vendor} / ${row.invoice_file_name}`);
    } catch (err) {
      failed += 1;
      console.error(`[${i + 1}/${rows.length}] FALLO: ${row.vendor} / ${row.invoice_file_name} -> ${err.message}`);
    }

    // Cada 15 filas, VACUUM normal para que Postgres reutilice el espacio que vamos liberando.
    if ((i + 1) % 15 === 0) {
      await pool.query("VACUUM master_file_entries");
    }
  }

  await pool.query("VACUUM master_file_entries");

  const { rows: sizeRows } = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) AS s");
  console.log(`\nMigradas: ${migrated}, fallidas: ${failed}`);
  console.log(`Tamano de la base de datos ahora: ${sizeRows[0].s}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
