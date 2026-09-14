import { google } from "googleapis";
import { Readable } from "stream";

// Drive storage for P.O.'s, Commercial Invoices and Facturas — replaces
// Vercel Blob for these document types to keep Vercel storage near zero.
// Auth is a single OAuth "installed app" identity (Juliana's own Drive),
// authorized once with the full `drive` scope so it can see the folders she
// already created herself, not just files the app uploads.
function getDriveClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function uploadToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  bytes: Buffer,
): Promise<string> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: Readable.from(bytes) },
    fields: "id",
  });
  if (!res.data.id) throw new Error("Drive upload did not return a file ID");
  return res.data.id;
}

export async function downloadFromDrive(
  fileId: string,
): Promise<{ bytes: Buffer; mimeType: string; fileName: string }> {
  const drive = getDriveClient();
  const [meta, content] = await Promise.all([
    drive.files.get({ fileId, fields: "name, mimeType" }),
    drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" }),
  ]);
  return {
    bytes: Buffer.from(content.data as ArrayBuffer),
    mimeType: meta.data.mimeType ?? "application/octet-stream",
    fileName: meta.data.name ?? "archivo",
  };
}

export type DriveFile = { id: string; name: string; mimeType: string; size: number };

export async function listFolderFiles(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size)",
      pageSize: 1000,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      if (f.id && f.name) {
        files.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType ?? "application/octet-stream",
          size: Number(f.size ?? 0),
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return files;
}

export type DriveFileWithFolder = DriveFile & { topFolder: string };

// Facturas is organized as one subfolder per vendor (unlike the flat P.O.
// folder), so finding new files means walking every vendor subfolder. Google
// Drive's API has no cheap "list changes" shortcut here without a stored
// page token, so each subfolder is listed fresh — done in parallel (one
// batch per depth level) rather than one-at-a-time, since a sequential walk
// over 100+ vendor subfolders is slow enough to risk a serverless timeout.
export async function listFolderFilesRecursive(
  folderId: string,
  maxDepth = 3,
): Promise<DriveFileWithFolder[]> {
  const drive = getDriveClient();

  async function listChildren(id: string) {
    const files: DriveFile[] = [];
    let pageToken: string | undefined;
    do {
      const res = await drive.files.list({
        q: `'${id}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType, size)",
        pageSize: 1000,
        pageToken,
      });
      for (const f of res.data.files ?? []) {
        if (f.id && f.name) {
          files.push({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType ?? "application/octet-stream",
            size: Number(f.size ?? 0),
          });
        }
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
    return files;
  }

  const result: DriveFileWithFolder[] = [];

  async function walk(id: string, topFolder: string, depth: number) {
    const children = await listChildren(id);
    const subfolders = children.filter(
      (c) => c.mimeType === "application/vnd.google-apps.folder",
    );
    for (const c of children) {
      if (c.mimeType !== "application/vnd.google-apps.folder") {
        result.push({ ...c, topFolder });
      }
    }
    if (depth < maxDepth && subfolders.length > 0) {
      await Promise.all(subfolders.map((sf) => walk(sf.id, topFolder || sf.name, depth + 1)));
    }
  }

  const topLevel = await listChildren(folderId);
  const topFolders = topLevel.filter((c) => c.mimeType === "application/vnd.google-apps.folder");
  for (const c of topLevel) {
    if (c.mimeType !== "application/vnd.google-apps.folder") {
      result.push({ ...c, topFolder: "" });
    }
  }
  await Promise.all(topFolders.map((f) => walk(f.id, f.name, 1)));

  return result;
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId }).catch(() => {
    // Already gone or unreachable — the DB row is what matters for the UI.
  });
}
