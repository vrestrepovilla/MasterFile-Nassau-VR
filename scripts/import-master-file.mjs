import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const XLSX_PATH = join(__dirname, "..", "Cay_Building_Compras_2026.xlsx");

// Columnas A..T de la hoja "AP - Purchasing Log" (fila 4 = encabezado, filas 5-144 = datos).
const COLUMNS = [
  "vendor", // A
  "account", // B
  "invoice_number", // C
  "po_number", // D
  "amount", // E
  "payment_status", // F
  "due_date", // G (fecha serial)
  "paid_on", // H (fecha serial)
  "payment_method", // I
  "freight_lead_time", // J
  "freight_cost", // K
  "wr_number", // L
  "received_on", // M (fecha serial)
  "weight_lb", // N
  "volume_ft3", // O
  "commercial_invoice_number", // P
  "shipping_status", // Q
  "project", // R
  "sub_project", // S
  "notes", // T
];
const DATE_FIELDS = new Set(["due_date", "paid_on", "received_on"]);
const NUMERIC_FIELDS = new Set(["amount", "freight_cost", "weight_lb", "volume_ft3"]);

function unescapeXml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function excelSerialToIsoDate(serial) {
  const days = Math.floor(Number(serial) - 25569);
  const date = new Date(days * 86400 * 1000);
  return date.toISOString().slice(0, 10);
}

function colLetterToIndex(letter) {
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1; // 0-based
}

function parseRow(rowXml) {
  const values = new Array(COLUMNS.length).fill(null);
  const cellRe = /<c r="([A-Z]+)\d+"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = cellRe.exec(rowXml))) {
    const [, colLetter, inner] = m;
    const idx = colLetterToIndex(colLetter);
    if (idx < 0 || idx >= COLUMNS.length || !inner) continue;

    let value = null;
    const textMatch = inner.match(/<is><t[^>]*>([\s\S]*?)<\/t><\/is>/);
    const numMatch = inner.match(/<v>([^<]*)<\/v>/);
    if (textMatch) value = unescapeXml(textMatch[1]).trim();
    else if (numMatch) value = numMatch[1];

    if (value === null || value === "") continue;

    const field = COLUMNS[idx];
    if (DATE_FIELDS.has(field)) value = excelSerialToIsoDate(value);
    values[idx] = value;
  }
  return values;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL en .env.local");
    process.exit(1);
  }

  const tmpDir = mkdtempSync(join(tmpdir(), "cay-master-file-"));
  try {
    const zipCopy = join(tmpDir, "workbook.zip");
    copyFileSync(XLSX_PATH, zipCopy);
    execFileSync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Expand-Archive -LiteralPath '${zipCopy.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force`,
    ]);

    const sheetXml = readFileSync(join(tmpDir, "xl", "worksheets", "sheet1.xml"), "utf8");
    const rowRe = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
    const rows = [];
    let rm;
    while ((rm = rowRe.exec(sheetXml))) {
      const rowNum = Number(rm[1]);
      if (rowNum < 5 || rowNum > 144) continue; // filas de datos segun el dimension del archivo
      rows.push(parseRow(rm[2]));
    }

    console.log(`Filas de datos encontradas: ${rows.length}`);

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    let inserted = 0;
    for (const values of rows) {
      const record = Object.fromEntries(COLUMNS.map((c, i) => [c, values[i]]));
      if (!record.vendor || !record.po_number) continue; // fila incompleta, no se importa

      for (const f of NUMERIC_FIELDS) {
        if (record[f] != null) record[f] = Number(record[f]);
      }

      await pool.query(
        `INSERT INTO master_file_entries
           (vendor, account, invoice_number, po_number, amount, payment_status, due_date, paid_on,
            payment_method, freight_lead_time, freight_cost, wr_number, received_on, weight_lb,
            volume_ft3, commercial_invoice_number, shipping_status, project, sub_project, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        COLUMNS.map((c) => record[c])
      );
      inserted += 1;
    }

    console.log(`Filas importadas a master_file_entries: ${inserted}`);
    await pool.end();
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
