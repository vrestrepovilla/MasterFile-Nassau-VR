"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { str } from "@/lib/form-utils";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");
  return session;
}

function parseDepartment(value: string | null): "all" | "logistica" | "compras" {
  return value === "logistica" || value === "compras" ? value : "all";
}

// The "view only" scope is optional and must differ from the main
// department (no point granting read-only access to the area they already
// fully edit) — "none"/"all"/a blank value all mean "no extra area".
function parseReadOnlyDepartment(
  value: string | null,
  department: "all" | "logistica" | "compras",
): "logistica" | "compras" | null {
  if (value !== "logistica" && value !== "compras") return null;
  return value === department ? null : value;
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const name = str(formData, "name");
  const email = str(formData, "email")?.toLowerCase() ?? null;
  const password = str(formData, "password");
  const role = str(formData, "role") === "admin" ? "admin" : "editor";
  const department = parseDepartment(str(formData, "department"));
  const readOnlyDepartment = parseReadOnlyDepartment(str(formData, "readOnlyDepartment"), department);
  if (!name || !email || !password) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await db
    .insert(users)
    .values({ name, email, passwordHash, role, department, readOnlyDepartment });

  revalidatePath("/users");
  redirect("/users?success=user-created");
}

export async function updateUserRole(id: number, formData: FormData) {
  await requireAdmin();
  const role = str(formData, "role") === "admin" ? "admin" : "editor";
  const department = parseDepartment(str(formData, "department"));
  const readOnlyDepartment = parseReadOnlyDepartment(str(formData, "readOnlyDepartment"), department);
  await db.update(users).set({ role, department, readOnlyDepartment }).where(eq(users.id, id));
  revalidatePath("/users");
}

export async function resetUserPassword(id: number, formData: FormData) {
  await requireAdmin();
  const password = str(formData, "password");
  if (!password) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  revalidatePath("/users");
  redirect("/users?success=password-reset");
}

export async function updateOwnPassword(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const password = str(formData, "password");
  if (!password) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, Number(session.user.id)));
  revalidatePath("/settings");
  redirect("/settings?success=password-updated");
}

export async function deleteUser(id: number) {
  const session = await requireAdmin();
  if (Number(session.user.id) === id) return;

  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/users");
}
