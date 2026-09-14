import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { priceEntries } from "@/lib/db/schema";

export type PriceEntryRow = typeof priceEntries.$inferSelect;

export async function getPriceEntries(): Promise<PriceEntryRow[]> {
  return db.select().from(priceEntries).orderBy(desc(priceEntries.poDate));
}
