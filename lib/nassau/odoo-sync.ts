import { eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { nassauMasterFileEntries } from "@/lib/db/schema";

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB || "caybuilding1";
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_API_KEY = process.env.ODOO_API_KEY;

// Código de la destination location en Odoo -> nombre de obra para Compras
// Nassau. Los que no tienen equivalencia confirmada quedan con el código tal
// cual (se ve como "APTME" en vez de un nombre bonito, pero no se pierde).
const LOCATION_NAMES: Record<string, string> = {
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

function obraNameFromLocationDisplay(display: string | null | undefined) {
  if (!display) return null;
  const code = display.split("/")[0].trim();
  return LOCATION_NAMES[code] ?? code;
}

let ridCounter = 1;
async function jsonrpc(service: string, method: string, args: unknown[]) {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: ridCounter++ }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

async function executeKw(
  uid: number,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {},
) {
  return jsonrpc("object", "execute_kw", [ODOO_DB, uid, ODOO_API_KEY, model, method, args, kwargs]);
}

type OdooPO = {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  amount_total: number;
  picking_ids: number[];
  date_order: string | false;
};

type OdooPicking = {
  id: number;
  location_dest_id: [number, string] | false;
  move_ids: number[];
};

type OdooMove = {
  id: number;
  product_id: [number, string] | false;
  product_uom_qty: number;
};

export type NassauOdooSyncResult = {
  totalOrders: number;
  newOrders: number;
  inserted: number;
};

// Pulls new Purchase Orders (and their shipped items/destination) from the
// Nassau team's Odoo instance into nassau_master_file_entries — this is the
// primary "new P.O." ingestion path for Nassau (the AgentMail purchase-request
// inbox exists too, but Odoo is where POs are actually issued).
export async function syncNassauFromOdoo(): Promise<NassauOdooSyncResult> {
  if (!ODOO_URL || !ODOO_USERNAME || !ODOO_API_KEY) {
    return { totalOrders: 0, newOrders: 0, inserted: 0 };
  }

  const uid = await jsonrpc("common", "authenticate", [ODOO_DB, ODOO_USERNAME, ODOO_API_KEY, {}]);
  if (!uid) throw new Error("No se pudo autenticar en Odoo.");

  const missingPoDateRows = await db
    .select({ poNumber: nassauMasterFileEntries.poNumber })
    .from(nassauMasterFileEntries)
    .where(isNull(nassauMasterFileEntries.poDate));
  const missingPoDate = new Set(missingPoDateRows.map((r) => r.poNumber));

  const allExistingRows = await db
    .select({ poNumber: nassauMasterFileEntries.poNumber })
    .from(nassauMasterFileEntries);
  const known = new Set(allExistingRows.map((r) => r.poNumber));

  const poIds: number[] = await executeKw(
    uid,
    "purchase.order",
    "search",
    [[["state", "not in", ["draft", "sent", "cancel"]]]],
    { order: "id asc" },
  );
  const pos: OdooPO[] = await executeKw(uid, "purchase.order", "read", [poIds], {
    fields: ["name", "partner_id", "amount_total", "picking_ids", "date_order"],
  });

  const newPos = pos.filter((po) => !known.has(po.name));

  // POs already in the table but synced before po_date existed — backfill
  // now that we have the real date, so date-based reports stay correct.
  const posToBackfill = pos.filter((po) => missingPoDate.has(po.name) && po.date_order);
  for (const po of posToBackfill) {
    await db
      .update(nassauMasterFileEntries)
      .set({ poDate: String(po.date_order).slice(0, 10) })
      .where(eq(nassauMasterFileEntries.poNumber, po.name));
  }

  const pickingIds = newPos.flatMap((po) => po.picking_ids);
  const pickingsById = new Map<number, OdooPicking>();
  if (pickingIds.length > 0) {
    const pickings: OdooPicking[] = await executeKw(uid, "stock.picking", "read", [pickingIds], {
      fields: ["location_dest_id", "move_ids"],
    });
    for (const p of pickings) pickingsById.set(p.id, p);
  }

  const moveIds = Array.from(pickingsById.values()).flatMap((p) => p.move_ids ?? []);
  const movesById = new Map<number, OdooMove>();
  if (moveIds.length > 0) {
    const moves: OdooMove[] = await executeKw(uid, "stock.move", "read", [moveIds], {
      fields: ["product_id", "product_uom_qty"],
    });
    for (const m of moves) movesById.set(m.id, m);
  }

  function itemsTextForPo(po: OdooPO): string | null {
    const parts: string[] = [];
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
    const project =
      picking && picking.location_dest_id ? obraNameFromLocationDisplay(picking.location_dest_id[1]) : null;
    const vendor = po.partner_id ? po.partner_id[1] : null;
    const items = itemsTextForPo(po);

    if (!vendor || !po.name) continue;

    const poDate = po.date_order ? String(po.date_order).slice(0, 10) : null;

    await db.insert(nassauMasterFileEntries).values({
      vendor,
      poNumber: po.name,
      amount: po.amount_total,
      project,
      notes: items,
      location: "nassau",
      poDate,
    });
    inserted += 1;
  }

  return { totalOrders: pos.length, newOrders: newPos.length, inserted };
}
