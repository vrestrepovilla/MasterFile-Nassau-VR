"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { bool, str } from "@/lib/form-utils";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");
  return session;
}

export async function createProject(formData: FormData) {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) return;

  await db.insert(projects).values({
    name,
    location: str(formData, "location"),
    supervisor: str(formData, "supervisor"),
  });

  revalidatePath("/projects");
  revalidatePath("/containers");
}

export async function updateProject(id: number, formData: FormData) {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) return;

  await db
    .update(projects)
    .set({
      name,
      location: str(formData, "location"),
      supervisor: str(formData, "supervisor"),
      active: bool(formData, "active"),
    })
    .where(eq(projects.id, id));

  revalidatePath("/projects");
  revalidatePath("/containers");
}

export async function deleteProject(id: number) {
  await requireAdmin();
  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath("/projects");
  revalidatePath("/containers");
}
