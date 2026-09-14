"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireDepartmentWrite } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { priceEntries } from "@/lib/db/schema";
import { str, num } from "@/lib/form-utils";

export async function updatePriceEntry(id: number, formData: FormData) {
  await requireDepartmentWrite("compras");

  const material = str(formData, "material");
  if (!material) return;

  await db
    .update(priceEntries)
    .set({
      material,
      unit: str(formData, "unit"),
      unitCost: num(formData, "unitCost"),
      vendor: str(formData, "vendor"),
    })
    .where(eq(priceEntries.id, id));

  revalidatePath("/compras/precios");
}

export async function deletePriceEntry(id: number) {
  await requireDepartmentWrite("compras");

  await db.delete(priceEntries).where(eq(priceEntries.id, id));
  revalidatePath("/compras/precios");
}
