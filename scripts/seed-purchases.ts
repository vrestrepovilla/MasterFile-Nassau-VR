import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";

const DATA_FILE =
  "C:\\Users\\Juliana\\AppData\\Local\\Temp\\claude\\C--Users-Juliana-OneDrive-Desktop-Container-Tracker\\99012609-c10e-4003-a216-bfb6a57a4d72\\scratchpad\\procurement.json";

type PurchaseSeed = {
  source: string;
  vendor: string | null;
  account: string | null;
  invoiceNumber: string | null;
  poNumber: string | null;
  amount: number | null;
  status: string | null;
  dueDate: string | null;
  paidOn: string | null;
  paymentMethod: string | null;
  leadTimeInFreight: string | null;
  freightVendor: string | null;
  warehouseReceiptNumber: string | null;
  receivedOn: string | null;
  weightLb: number | null;
  volumeFt3: number | null;
  commInvoiceNumber: string | null;
  ciStatus: string | null;
  project: string | null;
  subProject: string | null;
  notes: string | null;
  payApp: string | null;
  shippingMode: string | null;
  containerNumber: string | null;
};

async function main() {
  const { db } = await import("../lib/db");
  const { purchases } = await import("../lib/db/schema");

  const raw = fs.readFileSync(path.resolve(DATA_FILE), "utf-8");
  const rows: PurchaseSeed[] = JSON.parse(raw);

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await db.insert(purchases).values(batch);
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${rows.length}`);
  }

  console.log(`Listo. Total insertado: ${inserted}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
