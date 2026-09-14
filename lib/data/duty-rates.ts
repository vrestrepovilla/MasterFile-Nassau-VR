import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { dutyRates } from "@/lib/db/schema";

export async function getDutyRates() {
  return db.select().from(dutyRates).orderBy(asc(dutyRates.merchandise));
}
