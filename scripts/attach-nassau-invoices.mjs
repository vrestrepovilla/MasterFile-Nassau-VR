import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// "Invoice #TA3739753.pdf", "Invoice#4720.pdf", "Invoice  #HS3S7777.pdf", "Invoice #608433(1).pdf" -> "TA3739753" / "4720" / "HS3S7777" / "608433"
// "Invoice 1259- Ace.pdf", "Invoice P50348.pdf" (sin #) -> "1259" / "P50348"
function extractInvoiceNumber(filename) {
  const base = filename.replace(/\.[^.]+$/, "");
  const hashIdx = base.lastIndexOf("#");
  if (hashIdx !== -1) {
    let rest = base.slice(hashIdx + 1).trim();
    rest = rest.replace(/\(\d+\)\s*$/, "").trim();
    return rest || null;
  }
  const m = base.match(/Invoic[ed]e?\s+([A-Za-z0-9]+)/i);
  return m ? m[1] : null;
}

// Quita guiones y ceros a la izquierda para comparar formatos equivalentes ("2-612177" == "2612177", "001099" == "1099").
function normalize(s) {
  return s.replace(/-/g, "").replace(/^0+(?=.)/, "").toLowerCase();
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Uso: node scripts/attach-nassau-invoices.mjs <directorio con las carpetas de proveedores>");
    process.exit(1);
  }

  const files = walk(dir).filter((f) => CONTENT_TYPES[extname(f).toLowerCase()]);
  console.log(`Archivos encontrados: ${files.length}`);

  const byInvoice = new Map();
  const unparsed = [];
  for (const f of files) {
    const name = f.split(/[\\/]/).pop();
    const inv = extractInvoiceNumber(name);
    if (!inv) {
      unparsed.push(f);
      continue;
    }
    const key = normalize(inv);
    if (!byInvoice.has(key)) byInvoice.set(key, []);
    byInvoice.get(key).push(f);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  const { rows } = await pool.query(
    "SELECT id, invoice_number, vendor, po_number FROM master_file_entries WHERE location='nassau' AND invoice_number IS NOT NULL"
  );

  // Indice principal: numero de factura completo normalizado -> fila.
  const dbByFull = new Map();
  // Indice secundario: cada "parte" de un valor combinado con "/" (solo partes largas, no sufijos de pagina) -> fila.
  const dbByPart = new Map();
  for (const r of rows) {
    const fullKey = normalize(r.invoice_number.trim());
    if (!dbByFull.has(fullKey)) dbByFull.set(fullKey, []);
    dbByFull.get(fullKey).push(r);

    const parts = r.invoice_number.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (const p of parts) {
        if (p.length < 4) continue; // "1259/1" -> el "1" es un sufijo de pagina, no un numero de factura real
        const partKey = normalize(p);
        if (!dbByPart.has(partKey)) dbByPart.set(partKey, []);
        dbByPart.get(partKey).push(r);
      }
    }
  }

  const attachedRowIds = new Set();
  let attached = 0;
  const noDbMatch = [];
  const ambiguousDb = [];
  const skippedDuplicateRow = [];

  for (const [key, filePaths] of byInvoice) {
    // 1) match directo, 2) sufijo de pagina "/1" o "/2" (caso "Ace"), 3) parte de un valor combinado
    let dbMatches = dbByFull.get(key);
    if (!dbMatches) dbMatches = dbByFull.get(normalize(`${key}/1`)) ?? dbByFull.get(normalize(`${key}/2`));
    if (!dbMatches) dbMatches = dbByPart.get(key);

    if (!dbMatches || dbMatches.length === 0) {
      noDbMatch.push({ key, files: filePaths.map((f) => f.split(/[\\/]/).pop()) });
      continue;
    }
    if (dbMatches.length > 1) {
      ambiguousDb.push({ key, rows: dbMatches });
      continue;
    }

    const row = dbMatches[0];
    if (attachedRowIds.has(row.id)) {
      skippedDuplicateRow.push({ key, po_number: row.po_number, vendor: row.vendor });
      continue;
    }

    let chosen = filePaths.find((f) => !/\(\d+\)\.[^.]+$/i.test(f));
    if (!chosen) {
      chosen = filePaths.reduce((a, b) => (statSync(a).size >= statSync(b).size ? a : b));
    }

    const buffer = readFileSync(chosen);
    const contentType = CONTENT_TYPES[extname(chosen).toLowerCase()];
    const fileName = chosen.split(/[\\/]/).pop();

    await pool.query(
      `UPDATE master_file_entries
       SET invoice_file_name = $1, invoice_file_content_type = $2, invoice_file_data = $3, updated_at = now()
       WHERE id = $4`,
      [fileName, contentType, buffer, row.id]
    );
    attachedRowIds.add(row.id);
    attached += 1;
  }

  console.log(`\nFacturas asociadas: ${attached}`);
  console.log(`\nNumeros de factura de archivos SIN fila correspondiente en la base de datos: ${noDbMatch.length}`);
  for (const x of noDbMatch) console.log(`  - "${x.key}" (${x.files.join(", ")})`);
  console.log(`\nNumeros de factura AMBIGUOS (mas de una fila en la base de datos): ${ambiguousDb.length}`);
  for (const x of ambiguousDb) console.log(`  - "${x.key}":`, JSON.stringify(x.rows));
  console.log(`\nArchivos que apuntaban a una fila que ya recibio otro archivo (factura combinada): ${skippedDuplicateRow.length}`);
  for (const x of skippedDuplicateRow) console.log(`  - "${x.key}" -> ${x.vendor} / ${x.po_number}`);
  console.log(`\nArchivos SIN numero de factura reconocible en el nombre: ${unparsed.length}`);
  for (const f of unparsed) console.log(`  - ${f}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
