import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB || "caybuilding1";
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_API_KEY = process.env.ODOO_API_KEY;

// Codigo de la destination location en Odoo -> nombre de Obra para el Master File.
// Los que no tienen equivalencia confirmada todavia quedan con el codigo tal cual.
const LOCATION_NAMES = {
  APTME: "Apartment Mercedes",
  ATLAN: "Atlantis RT",
  CAYHS: "Cay Building House",
  CHINA: "China",
  EXDEM: "Exuma Demolitions",
  FOX: "Fox",
  KHSS: "Great Harbour KHSS",
  NICHS: "Nicolai House",
  OCT: "Ocean Club-Building D",
  PPE: "Personal Protective Equipment",
  SANDB: "Balmoral Interior 2026",
  WARHT: "Warwick Hotel",
  Yard: "Yard",
};

function obraNameFromLocationDisplay(display) {
  if (!display) return null;
  const code = display.split("/")[0].trim();
  return LOCATION_NAMES[code] ?? code;
}

let ridCounter = 1;
async function jsonrpc(service, method, args) {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: ridCounter++ }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

let uid;
async function execute_kw(model, method, args, kwargs = {}) {
  return jsonrpc("object", "execute_kw", [ODOO_DB, uid, ODOO_API_KEY, model, method, args, kwargs]);
}

async function main() {
  if (!ODOO_URL || !ODOO_USERNAME || !ODOO_API_KEY) {
    console.error("Faltan ODOO_URL, ODOO_USERNAME o ODOO_API_KEY en .env.local");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL en .env.local");
    process.exit(1);
  }

  uid = await jsonrpc("common", "authenticate", [ODOO_DB, ODOO_USERNAME, ODOO_API_KEY, {}]);
  if (!uid) throw new Error("No se pudo autenticar en Odoo.");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows: existingRows } = await pool.query(
      "SELECT po_number FROM master_file_entries WHERE location = 'nassau'"
    );
    const known = new Set(existingRows.map((r) => r.po_number));

    const poIds = await execute_kw(
      "purchase.order",
      "search",
      [[["state", "not in", ["draft", "sent", "cancel"]]]],
      { order: "id asc" }
    );
    const pos = await execute_kw("purchase.order", "read", [poIds], {
      fields: ["name", "partner_id", "amount_total", "picking_ids"],
    });

    const newPos = pos.filter((po) => !known.has(po.name));
    console.log(`Ordenes de compra en Odoo: ${pos.length}. Nuevas (no importadas aun): ${newPos.length}.`);

    const pickingIds = newPos.flatMap((po) => po.picking_ids);
    const pickingsById = new Map();
    if (pickingIds.length > 0) {
      const pickings = await execute_kw("stock.picking", "read", [pickingIds], {
        fields: ["location_dest_id", "state", "move_ids"],
      });
      for (const p of pickings) pickingsById.set(p.id, p);
    }

    const moveIds = Array.from(pickingsById.values()).flatMap((p) => p.move_ids ?? []);
    const movesById = new Map();
    if (moveIds.length > 0) {
      const moves = await execute_kw("stock.move", "read", [moveIds], {
        fields: ["product_id", "product_uom_qty"],
      });
      for (const m of moves) movesById.set(m.id, m);
    }

    function itemsTextForPo(po) {
      const parts = [];
      for (const pickingId of po.picking_ids) {
        const picking = pickingsById.get(pickingId);
        if (!picking) continue;
        for (const moveId of picking.move_ids ?? []) {
          const move = movesById.get(moveId);
          if (!move || !move.product_id) continue;
          const qty = move.product_uom_qty % 1 === 0 ? move.product_uom_qty : Number(move.product_uom_qty.toFixed(2));
          parts.push(`${move.product_id[1]} x${qty}`);
        }
      }
      return parts.length > 0 ? parts.join(", ") : null;
    }

    let inserted = 0;
    for (const po of newPos) {
      const picking = po.picking_ids.map((id) => pickingsById.get(id)).find((p) => p && p.location_dest_id);
      const project = picking ? obraNameFromLocationDisplay(picking.location_dest_id[1]) : null;
      const vendor = po.partner_id ? po.partner_id[1] : null;
      const items = itemsTextForPo(po);

      if (!vendor || !po.name) continue;

      await pool.query(
        `INSERT INTO master_file_entries (vendor, po_number, amount, project, notes, location)
         VALUES ($1, $2, $3, $4, $5, 'nassau')`,
        [vendor, po.name, po.amount_total, project, items]
      );
      inserted += 1;
    }

    console.log(`Filas nuevas insertadas en master_file_entries (Nassau): ${inserted}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
