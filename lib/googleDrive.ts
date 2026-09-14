import { Readable } from "node:stream";
import { google, drive_v3 } from "googleapis";

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

function vendorsFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_VENDORS_FOLDER_ID;
  if (!id) throw new Error("Falta GOOGLE_DRIVE_VENDORS_FOLDER_ID en .env.local");
  return id;
}

function escapeForQuery(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Busca la subcarpeta del proveedor dentro de Vendors/ (tal como ya estan organizadas en Drive);
// si no existe todavia (proveedor nuevo), la crea.
async function findOrCreateVendorFolder(drive: drive_v3.Drive, vendorName: string): Promise<string> {
  const parent = vendorsFolderId();
  const name = escapeForQuery(vendorName.trim());
  const res = await drive.files.list({
    q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and '${parent}' in parents and trashed = false`,
    fields: "files(id, name)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    corpora: "allDrives",
  });
  const existing = res.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: { name: vendorName.trim(), mimeType: "application/vnd.google-apps.folder", parents: [parent] },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error("No se pudo crear la carpeta del proveedor en Drive.");
  return created.data.id;
}

export async function uploadInvoiceFileToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  vendorName: string
): Promise<string> {
  const drive = getDriveClient();
  const folderId = await findOrCreateVendorFolder(drive, vendorName);
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!res.data.id) throw new Error("Google Drive no devolvio un id de archivo.");
  return res.data.id;
}

export async function renameFileInDrive(fileId: string, newName: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.update({ fileId, requestBody: { name: newName }, supportsAllDrives: true });
}

// Nombra el archivo como "Invoice #<numero>.<extension>" (el formato que ya usan casi todas las
// carpetas de proveedores) si tenemos numero de factura; si no, deja el nombre original.
export function buildInvoiceFilename(invoiceNumber: string | null, originalFilename: string): string {
  const extMatch = originalFilename.match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0] : "";
  if (!invoiceNumber) return originalFilename;
  return `Invoice #${invoiceNumber}${ext}`;
}

export async function downloadFileFromDrive(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true }).catch(() => {});
}
