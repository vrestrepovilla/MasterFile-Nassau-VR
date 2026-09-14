import { Readable } from "node:stream";
import { google, drive_v3 } from "googleapis";

// Separate Google identity from the main app's lib/google-drive.ts — this
// one is the Nassau team's own OAuth client, already authorized against
// their "Vendors" Drive folder (and already carries Gmail compose scope,
// used by lib/nassau/gmail.ts for the outstanding-invoices report draft).
function getDriveClient(): drive_v3.Drive {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Faltan credenciales de Google Drive (Nassau) en .env.local");
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

// Busca la subcarpeta del proveedor dentro de Vendors/ (tal como ya estan
// organizadas en Drive); si no existe todavia (proveedor nuevo), la crea.
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

export async function uploadNassauInvoiceFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  vendorName: string,
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

export async function renameNassauFileInDrive(fileId: string, newName: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.update({ fileId, requestBody: { name: newName }, supportsAllDrives: true });
}

// Moves a file (e.g. one auto-filed under "Unmatched" or the wrong vendor at
// ingestion time) into the correct vendor's folder — used when approving a
// pending invoice match against an entry whose vendor differs from wherever
// the file first landed.
export async function moveNassauFileToVendorFolder(fileId: string, vendorName: string): Promise<void> {
  const drive = getDriveClient();
  const [folderId, current] = await Promise.all([
    findOrCreateVendorFolder(drive, vendorName),
    drive.files.get({ fileId, fields: "parents", supportsAllDrives: true }),
  ]);
  const previousParents = (current.data.parents ?? []).join(",");
  await drive.files.update({
    fileId,
    addParents: folderId,
    removeParents: previousParents,
    supportsAllDrives: true,
  });
}

export function buildInvoiceFilename(invoiceNumber: string | null, originalFilename: string): string {
  const extMatch = originalFilename.match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0] : "";
  if (!invoiceNumber) return originalFilename;
  return `Invoice #${invoiceNumber}${ext}`;
}

export async function downloadNassauFileFromDrive(
  fileId: string,
): Promise<{ bytes: Buffer; mimeType: string; fileName: string }> {
  const drive = getDriveClient();
  const [meta, content] = await Promise.all([
    drive.files.get({ fileId, fields: "name, mimeType", supportsAllDrives: true }),
    drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" },
    ),
  ]);
  return {
    bytes: Buffer.from(content.data as ArrayBuffer),
    mimeType: meta.data.mimeType ?? "application/octet-stream",
    fileName: meta.data.name ?? "archivo",
  };
}

export async function deleteNassauFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true }).catch(() => {
    // Already gone or unreachable — the DB row is what matters for the UI.
  });
}
