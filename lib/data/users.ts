import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function getUsersLite() {
  return db.select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.name));
}
