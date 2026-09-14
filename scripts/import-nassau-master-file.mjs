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

const XLSX_PATH = join(__dirname, "..", "Nassau_Master_File_2026.xlsx");

// Columnas A..L de la hoja "2026" (fila 1 = encabezado, filas 2+ = datos).
const COLUMNS = [
  "_row_number", // A
  "vendor", // B
  "invoice_number", // C
  "po_number", // D
  "amount", // E
  "payment_status", // F
  "due_date", // G (texto MM/DD/YYYY o fecha serial)
  "paid_on", // H (texto MM/DD/YYYY o fecha serial)
  "payment_method", // I
  "project", // J
  "sub_project", // K
  "notes", // L
];
const DATE_FIELDS = new Set(["due_date", "paid_on"]);
const NUMERIC_FIELDS = new Set(["amount"]);

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

function usDateTextToIso(text) {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function colLetterToIndex(letter) {
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1; // 0-based
}

function loadSharedStrings(xml) {
  const strings = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    const text = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("");
    strings.push(unescapeXml(text));
  }
  return strings;
}

function parseRow(rowXml, sharedStrings) {
  const values = new Array(COLUMNS.length).fill(null);
  const cellRe = /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = cellRe.exec(rowXml))) {
    const [, colLetter, attrs, inner] = m;
    const idx = colLetterToIndex(colLetter);
    if (idx < 0 || idx >= COLUMNS.length || !inner) continue;

    const isString = /\bt="s"/.test(attrs);
    const numMatch = inner.match(/<v>([^<]*)<\/v>/);
    if (!numMatch) continue;

    const field = COLUMNS[idx];
    let value;
    if (isString) {
      value = sharedStrings[Number(numMatch[1])] ?? null;
      if (value != null && DATE_FIELDS.has(field)) {
        value = usDateTextToIso(value) ?? value;
      }
    } else {
      value = numMatch[1];
      if (DATE_FIELDS.has(field)) value = excelSerialToIsoDate(value);
      else if (field === "invoice_number") value = String(Number(value));
    }

    if (value === null || value === "") continue;
    values[idx] = value;
  }
  return values;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL en .env.local");
    process.exit(1);
  }

  const tmpDir = mkdtempSync(join(tmpdir(), "cay-nassau-master-file-"));
  try {
    const zipCopy = join(tmpDir, "workbook.zip");
    copyFileSync(XLSX_PATH, zipCopy);
    execFileSync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Expand-Archive -LiteralPath '${zipCopy.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force`,
    ]);

    const sharedStringsXml = readFileSync(join(tmpDir, "xl", "sharedStrings.xml"), "utf8");
    const sharedStrings = loadSharedStrings(sharedStringsXml);

    const sheetXml = readFileSync(join(tmpDir, "xl", "worksheets", "sheet1.xml"), "utf8");
    const rowRe = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
    const rows = [];
    let rm;
    while ((rm = rowRe.exec(sheetXml))) {
      const rowNum = Number(rm[1]);
      if (rowNum < 2) continue; // fila 1 = encabezado
      rows.push(parseRow(rm[2], sharedStrings));
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

      const cols = COLUMNS.filter((c) => c !== "_row_number");
      await pool.query(
        `INSERT INTO master_file_entries
           (vendor, invoice_number, po_number, amount, payment_status, due_date, paid_on,
            payment_method, project, sub_project, notes, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'nassau')`,
        cols.map((c) => record[c])
      );
      inserted += 1;
    }

    console.log(`Filas importadas a master_file_entries (Nassau): ${inserted}`);
    await pool.end();
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
