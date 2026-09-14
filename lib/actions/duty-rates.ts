"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dutyRates } from "@/lib/db/schema";
import { num, str } from "@/lib/form-utils";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/broker-calculator");
  return session;
}

export async function createDutyRate(formData: FormData) {
  await requireAdmin();

  const merchandise = str(formData, "merchandise");
  const dutyRatePercent = num(formData, "dutyRatePercent");
  if (!merchandise || dutyRatePercent === null) return;

  await db.insert(dutyRates).values({
    merchandise,
    technicalDescription: str(formData, "technicalDescription"),
    dutyRatePercent,
    hsCode: str(formData, "hsCode"),
    notes: str(formData, "notes"),
  });

  revalidatePath("/broker-calculator");
}

export async function deleteDutyRate(id: number) {
  await requireAdmin();
  await db.delete(dutyRates).where(eq(dutyRates.id, id));
  revalidatePath("/broker-calculator");
}
