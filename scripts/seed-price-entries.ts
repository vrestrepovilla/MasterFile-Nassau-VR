import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";

const DATA_FILE =
  "C:\\Users\\Juliana\\AppData\\Local\\Temp\\claude\\C--Users-Juliana-OneDrive-Desktop-Container-Tracker\\99012609-c10e-4003-a216-bfb6a57a4d72\\scratchpad\\po_price_entries.json";

type RawEntry = {
  poNumber: string;
  poDate: string; // "1/27/2026"
  vendor: string;
  material: string;
  unit: string;
  unitCost: number;
};

function toIsoDate(mdY: string): string | null {
  const m = mdY.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

async function main() {
  const { db } = await import("../lib/db");
  const { priceEntries } = await import("../lib/db/schema");

  const raw: RawEntry[] = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  const rows = raw.map((r) => ({
    material: r.material,
    unit: r.unit,
    unitCost: r.unitCost,
    vendor: r.vendor,
    poNumber: r.poNumber,
    poDate: toIsoDate(r.poDate),
  }));

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await db.insert(priceEntries).values(batch);
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
