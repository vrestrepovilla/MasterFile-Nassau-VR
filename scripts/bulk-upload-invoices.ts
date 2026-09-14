import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";

const MANIFEST =
  "C:\\Users\\Juliana\\AppData\\Local\\Temp\\claude\\C--Users-Juliana-OneDrive-Desktop-Container-Tracker\\99012609-c10e-4003-a216-bfb6a57a4d72\\scratchpad\\invoice_match_manifest.json";
const UPLOADED_BY = 1; // Juliana Trujillo
const CONCURRENCY = 6;

type MatchEntry = {
  file: string;
  purchaseIds: number[];
  vendor: string;
  matchType: string;
};

async function main() {
  const { put } = await import("@vercel/blob");
  const { db } = await import("../lib/db");
  const { purchaseInvoices } = await import("../lib/db/schema");

  const raw = fs.readFileSync(MANIFEST, "utf-8");
  const { matched }: { matched: MatchEntry[] } = JSON.parse(raw);

  console.log(`Files to upload: ${matched.length}`);

  let done = 0;
  let failed = 0;
  let rowsInserted = 0;
  const failures: { file: string; error: string }[] = [];

  async function processOne(entry: MatchEntry) {
    try {
      const bytes = fs.readFileSync(entry.file);
      const fileName = path.basename(entry.file);
      const firstPurchaseId = entry.purchaseIds[0];

      const blob = await put(`purchases/${firstPurchaseId}/${fileName}`, bytes, {
        access: "public",
        addRandomSuffix: true,
        contentType: "application/pdf",
      });

      for (const purchaseId of entry.purchaseIds) {
        await db.insert(purchaseInvoices).values({
          purchaseId,
          docType: "invoice",
          fileName,
          mimeType: "application/pdf",
          fileSize: bytes.length,
          blobUrl: blob.url,
          uploadedBy: UPLOADED_BY,
        });
        rowsInserted++;
      }
    } catch (err) {
      failed++;
      failures.push({ file: entry.file, error: String(err) });
    } finally {
      done++;
      if (done % 50 === 0 || done === matched.length) {
        console.log(`Progress: ${done}/${matched.length} (failed: ${failed})`);
      }
    }
  }

  // Simple concurrency pool.
  let index = 0;
  async function worker() {
    while (index < matched.length) {
      const i = index++;
      await processOne(matched[i]);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log("---");
  console.log(`Done. Files processed: ${done}, failed: ${failed}, rows inserted: ${rowsInserted}`);
  if (failures.length) {
    const failLog = path.join(path.dirname(MANIFEST), "upload_failures.json");
    fs.writeFileSync(failLog, JSON.stringify(failures, null, 1));
    console.log(`Failure details written to ${failLog}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
