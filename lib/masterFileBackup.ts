import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { google, drive_v3 } from "googleapis";
import { pool } from "@/lib/db";

const BACKUP_FILENAME = "Master File Nassau - Backup.xlsx";

function getDriveClient(): drive_v3.Drive {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Faltan credenciales de Google Drive en .env.local");
  }
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth });
}

// El backup se guarda junto a la carpeta "Vendors" (un nivel arriba), o sea directo en
// "Procurement Nassau" - no dentro de Vendors, para no mezclarlo con las facturas.
async function nassauRootFolderId(drive: drive_v3.Drive): Promise<string> {
  const vendorsFolderId = process.env.GOOGLE_DRIVE_VENDORS_FOLDER_ID;
  if (!vendorsFolderId) throw new Error("Falta GOOGLE_DRIVE_VENDORS_FOLDER_ID en .env.local");
  const res = await drive.files.get({ fileId: vendorsFolderId, fields: "parents", supportsAllDrives: true });
  const parent = res.data.parents?.[0];
  if (!parent) throw new Error("No se pudo encontrar la carpeta padre de Vendors en Drive.");
  return parent;
}

type Column = { header: string; key: string; width?: number; format?: "currency" | "date" };

const COLUMNS: Column[] = [
  { header: "Vendor", key: "vendor", width: 28 },
  { header: "Account", key: "account", width: 14 },
  { header: "Invoice #", key: "invoice_number", width: 16 },
  { header: "PO #", key: "po_number", width: 12 },
  { header: "Amount", key: "amount", width: 14, format: "currency" },
  { header: "Payment Status", key: "payment_status", width: 16 },
  { header: "Due Date", key: "due_date", width: 14, format: "date" },
  { header: "Paid On", key: "paid_on", width: 14, format: "date" },
  { header: "Payment Method", key: "payment_method", width: 18 },
  { header: "Freight Lead Time", key: "freight_lead_time", width: 16 },
  { header: "Freight Cost", key: "freight_cost", width: 14, format: "currency" },
  { header: "WR #", key: "wr_number", width: 14 },
  { header: "Received On", key: "received_on", width: 14, format: "date" },
  { header: "Weight (lb)", key: "weight_lb", width: 12 },
  { header: "Volume (ft3)", key: "volume_ft3", width: 12 },
  { header: "Commercial Invoice #", key: "commercial_invoice_number", width: 18 },
  { header: "Shipping Status", key: "shipping_status", width: 16 },
  { header: "Project", key: "project", width: 22 },
  { header: "Sub Project", key: "sub_project", width: 20 },
  { header: "Items", key: "notes", width: 40 },
  { header: "PO Date", key: "po_date", width: 14, format: "date" },
  { header: "Created At", key: "created_at", width: 14, format: "date" },
];

export async function buildMasterFileBackupBuffer(): Promise<Buffer> {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS.map((c) => c.key).join(", ")} FROM master_file_entries WHERE location = 'nassau' ORDER BY po_number`
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Master File");
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));
  sheet.getRow(1).font = { name: "Arial", bold: true };
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
  });

  for (const row of rows) {
    const rowValues: Record<string, unknown> = {};
    for (const col of COLUMNS) {
      const raw = row[col.key];
      rowValues[col.key] = raw instanceof Date ? raw.toISOString().slice(0, 10) : raw;
    }
    const excelRow = sheet.addRow(rowValues);
    for (const col of COLUMNS) {
      if (!col.format) continue;
      const cell = excelRow.getCell(col.key);
      if (col.format === "currency") cell.numFmt = '$#,##0.00;($#,##0.00);-';
      if (col.format === "date") cell.numFmt = "yyyy-mm-dd";
    }
    excelRow.font = { name: "Arial" };
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// Sube (o sobreescribe si ya existe) el archivo de respaldo en Drive. Se llama automaticamente
// despues de cada sync con Odoo, y tambien se puede disparar a mano desde el Master File.
export async function backupMasterFileToDrive(): Promise<{ fileId: string }> {
  const buffer = await buildMasterFileBackupBuffer();
  const drive = getDriveClient();
  const folderId = await nassauRootFolderId(drive);

  const existing = await drive.files.list({
    q: `name = '${BACKUP_FILENAME}' and '${folderId}' in parents and trashed = false`,
    fields: "files(id)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    corpora: "allDrives",
  });

  const media = {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: Readable.from(buffer),
  };

  const existingId = existing.data.files?.[0]?.id;
  if (existingId) {
    await drive.files.update({ fileId: existingId, media, supportsAllDrives: true });
    return { fileId: existingId };
  }

  const created = await drive.files.create({
    requestBody: { name: BACKUP_FILENAME, parents: [folderId] },
    media,
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error("Google Drive no devolvio un id de archivo.");
  return { fileId: created.data.id };
}
