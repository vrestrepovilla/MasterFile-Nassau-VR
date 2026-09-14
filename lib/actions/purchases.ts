"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireDepartmentWrite } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { purchases } from "@/lib/db/schema";
import { num, str } from "@/lib/form-utils";
import { syncPurchasesFromSheet } from "@/lib/purchases-sheet-sync";

function readPurchaseValues(formData: FormData) {
  return {
    vendor: str(formData, "vendor"),
    account: str(formData, "account"),
    invoiceNumber: str(formData, "invoiceNumber"),
    poNumber: str(formData, "poNumber"),
    amount: num(formData, "amount"),
    status: str(formData, "status"),
    dueDate: str(formData, "dueDate"),
    paidOn: str(formData, "paidOn"),
    paymentMethod: str(formData, "paymentMethod"),
    leadTimeInFreight: str(formData, "leadTimeInFreight"),
    freightVendor: str(formData, "freightVendor"),
    warehouseReceiptNumber: str(formData, "warehouseReceiptNumber"),
    receivedOn: str(formData, "receivedOn"),
    weightLb: num(formData, "weightLb"),
    volumeFt3: num(formData, "volumeFt3"),
    commInvoiceNumber: str(formData, "commInvoiceNumber"),
    ciStatus: str(formData, "ciStatus"),
    project: str(formData, "project"),
    subProject: str(formData, "subProject"),
    notes: str(formData, "notes"),
    payApp: str(formData, "payApp"),
    shippingMode: str(formData, "shippingMode"),
    containerNumber: str(formData, "containerNumber"),
  };
}

export async function createPurchase(formData: FormData) {
  const session = await requireDepartmentWrite("compras");

  const values = readPurchaseValues(formData);
  const [row] = await db
    .insert(purchases)
    .values({ ...values, source: "manual", createdBy: Number(session.user.id) })
    .returning({ id: purchases.id });

  revalidatePath("/compras");
  revalidatePath("/compras/purchases");
  redirect(`/compras/purchases/${row.id}`);
}

export async function updatePurchase(id: number, formData: FormData) {
  const session = await requireDepartmentWrite("compras");

  const values = readPurchaseValues(formData);
  await db
    .update(purchases)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(purchases.id, id));

  revalidatePath("/compras");
  revalidatePath("/compras/purchases");
  revalidatePath(`/compras/purchases/${id}`);
  redirect("/compras/purchases");
}

export async function deletePurchase(id: number) {
  const session = await requireDepartmentWrite("compras");

  await db.delete(purchases).where(eq(purchases.id, id));
  revalidatePath("/compras");
  revalidatePath("/compras/purchases");
}

// Manual trigger for the Compras page: picks up any row added directly to
// the Procurement Google Sheet (instead of through "+ Nueva compra") and
// creates the matching purchase.
export async function syncPurchasesFromSheetAction() {
  await requireDepartmentWrite("compras");
  const result = await syncPurchasesFromSheet();

  revalidatePath("/compras");
  revalidatePath("/compras/purchases");

  redirect(`/compras/purchases?synced=${result.created}`);
}
