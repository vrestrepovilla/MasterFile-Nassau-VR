import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchases } from "@/lib/db/schema";

export type PurchaseRow = typeof purchases.$inferSelect;

export async function getPurchases(options?: { source?: string }): Promise<PurchaseRow[]> {
  const query = db.select().from(purchases);
  if (options?.source) {
    query.where(eq(purchases.source, options.source));
  }
  return query.orderBy(
    // Numbered P.O.s sort first, from the most recently generated to the
    // oldest; rows without a plain numeric P.O# (freight, past invoices,
    // manual entries, or no P.O at all) sort after them. A plain CASE (not a
    // raw boolean) is required so NULL po_number falls into the
    // "non-numeric" group instead of sorting on its own.
    sql`CASE WHEN ${purchases.poNumber} ~ '^[0-9]+$' THEN 0 ELSE 1 END`,
    sql`CASE WHEN ${purchases.poNumber} ~ '^[0-9]+$' THEN ${purchases.poNumber}::integer END DESC`,
    desc(purchases.id),
  );
}

export async function getPurchaseById(id: number): Promise<PurchaseRow | null> {
  const [row] = await db.select().from(purchases).where(eq(purchases.id, id));
  return row ?? null;
}
