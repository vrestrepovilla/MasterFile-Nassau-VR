import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { containerProjects, containers, projects } from "@/lib/db/schema";

export type ProjectRow = typeof projects.$inferSelect;
export type ContainerRow = typeof containers.$inferSelect & {
  projects: ProjectRow[];
};

export async function getContainers(): Promise<ContainerRow[]> {
  // Sorted so containers sharing a single numeric CI# land next to each
  // other — the table groups them into one CI row with its containers
  // nested underneath, same idea as the P.O./WR grouping on Purchases.
  const rows = await db
    .select()
    .from(containers)
    .orderBy(
      sql`CASE WHEN ${containers.ciNumbers} ~ '^[0-9]+$' THEN 0 ELSE 1 END`,
      sql`CASE WHEN ${containers.ciNumbers} ~ '^[0-9]+$' THEN ${containers.ciNumbers}::integer END DESC`,
      desc(containers.createdAt),
    );

  const links = await db
    .select({ containerId: containerProjects.containerId, project: projects })
    .from(containerProjects)
    .innerJoin(projects, eq(containerProjects.projectId, projects.id));

  const byContainer = new Map<number, ProjectRow[]>();
  for (const link of links) {
    const list = byContainer.get(link.containerId) ?? [];
    list.push(link.project);
    byContainer.set(link.containerId, list);
  }

  return rows.map((row) => ({ ...row, projects: byContainer.get(row.id) ?? [] }));
}

export async function getContainerById(id: number): Promise<ContainerRow | null> {
  const [row] = await db.select().from(containers).where(eq(containers.id, id));
  if (!row) return null;

  const links = await db
    .select({ project: projects })
    .from(containerProjects)
    .innerJoin(projects, eq(containerProjects.projectId, projects.id))
    .where(eq(containerProjects.containerId, id));

  return { ...row, projects: links.map((l) => l.project) };
}
