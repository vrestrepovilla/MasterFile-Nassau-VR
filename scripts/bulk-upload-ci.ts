import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";

const MANIFEST =
  "C:\\Users\\Juliana\\AppData\\Local\\Temp\\claude\\C--Users-Juliana-OneDrive-Desktop-Container-Tracker\\99012609-c10e-4003-a216-bfb6a57a4d72\\scratchpad\\ci_manifest.json";
const UPLOADED_BY = 1; // Juliana Trujillo
const CONCURRENCY = 6;

type ManifestEntry = {
  file: string;
  ciNumber: string;
  fileKind: "pdf" | "excel";
  purchaseId: number | null;
  containerId: number | null;
};

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
};

async function main() {
  const { put } = await import("@vercel/blob");
  const { db } = await import("../lib/db");
  const { commercialInvoices } = await import("../lib/db/schema");

  const raw = fs.readFileSync(MANIFEST, "utf-8");
  const entries: ManifestEntry[] = JSON.parse(raw);

  console.log(`Files to upload: ${entries.length}`);

  let done = 0;
  let failed = 0;
  const failures: { file: string; error: string }[] = [];

  async function processOne(entry: ManifestEntry) {
    try {
      const bytes = fs.readFileSync(entry.file);
      const fileName = path.basename(entry.file);
      const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

      const blob = await put(`commercial-invoices/${entry.ciNumber}/${fileName}`, bytes, {
        access: "public",
        addRandomSuffix: true,
        contentType: MIME_TYPES[ext] ?? "application/octet-stream",
      });

      await db.insert(commercialInvoices).values({
        ciNumber: entry.ciNumber,
        fileKind: entry.fileKind,
        fileName,
        mimeType: MIME_TYPES[ext] ?? "application/octet-stream",
        fileSize: bytes.length,
        blobUrl: blob.url,
        purchaseId: entry.purchaseId,
        containerId: entry.containerId,
        uploadedBy: UPLOADED_BY,
      });
    } catch (err) {
      failed++;
      failures.push({ file: entry.file, error: String(err) });
    } finally {
      done++;
      if (done % 50 === 0 || done === entries.length) {
        console.log(`Progress: ${done}/${entries.length} (failed: ${failed})`);
      }
    }
  }

  let index = 0;
  async function worker() {
    while (index < entries.length) {
      const i = index++;
      await processOne(entries[i]);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log("---");
  console.log(`Done. Files processed: ${done}, failed: ${failed}`);
  if (failures.length) {
    const failLog = path.join(path.dirname(MANIFEST), "upload_failures_ci.json");
    fs.writeFileSync(failLog, JSON.stringify(failures, null, 1));
    console.log(`Failure details written to ${failLog}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
