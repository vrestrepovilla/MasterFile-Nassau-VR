import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export async function getProjects() {
  return db.select().from(projects).orderBy(asc(projects.name));
}
