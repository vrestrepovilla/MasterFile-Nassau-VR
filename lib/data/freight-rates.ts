import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { freightRates } from "@/lib/db/schema";

export async function getFreightRates() {
  return db
    .select()
    .from(freightRates)
    .orderBy(asc(freightRates.vendor), asc(freightRates.pod), asc(freightRates.containerSize));
}
