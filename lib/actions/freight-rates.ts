"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { freightRates } from "@/lib/db/schema";
import { num, str } from "@/lib/form-utils";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/rates");
  return session;
}

export async function createFreightRate(formData: FormData) {
  await requireAdmin();

  const vendor = str(formData, "vendor");
  const containerSize = str(formData, "containerSize");
  if (!vendor || !containerSize) return;

  await db.insert(freightRates).values({
    vendor,
    shippingLine: str(formData, "shippingLine"),
    pol: str(formData, "pol"),
    pod: str(formData, "pod"),
    transshipment: str(formData, "transshipment"),
    transitDays: num(formData, "transitDays"),
    departureDays: str(formData, "departureDays"),
    containerSize,
    price: num(formData, "price"),
    currency: str(formData, "currency") ?? "USD",
    notes: str(formData, "notes"),
  });

  revalidatePath("/rates");
}

export async function updateFreightRate(id: number, formData: FormData) {
  await requireAdmin();

  const vendor = str(formData, "vendor");
  const containerSize = str(formData, "containerSize");
  if (!vendor || !containerSize) return;

  await db
    .update(freightRates)
    .set({
      vendor,
      shippingLine: str(formData, "shippingLine"),
      pol: str(formData, "pol"),
      pod: str(formData, "pod"),
      transshipment: str(formData, "transshipment"),
      transitDays: num(formData, "transitDays"),
      departureDays: str(formData, "departureDays"),
      containerSize,
      price: num(formData, "price"),
      currency: str(formData, "currency") ?? "USD",
      notes: str(formData, "notes"),
    })
    .where(eq(freightRates.id, id));

  revalidatePath("/rates");
}

export async function deleteFreightRate(id: number) {
  await requireAdmin();
  await db.delete(freightRates).where(eq(freightRates.id, id));
  revalidatePath("/rates");
}
