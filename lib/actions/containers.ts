"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireDepartmentWrite } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { containerProjects, containers } from "@/lib/db/schema";
import { bool, num, str } from "@/lib/form-utils";
import { STATUS_OPTIONS, type Status } from "@/lib/constants";

function readStatus(formData: FormData): Status {
  const value = str(formData, "status");
  return (STATUS_OPTIONS as readonly string[]).includes(value ?? "")
    ? (value as Status)
    : "Preparing";
}

function readContainerValues(formData: FormData) {
  return {
    status: readStatus(formData),
    containerNumber: str(formData, "containerNumber"),
    size: str(formData, "size"),
    ciNumbers: str(formData, "ciNumbers"),
    ciDate: str(formData, "ciDate"),
    ciValue: num(formData, "ciValue"),
    ciCurrency: str(formData, "ciCurrency") ?? "USD",
    shippingLine: str(formData, "shippingLine"),
    billOfLading: str(formData, "billOfLading"),
    etd: str(formData, "etd"),
    portOfDischarge: str(formData, "portOfDischarge"),
    eta: str(formData, "eta"),
    etaJobsite: str(formData, "etaJobsite"),
    returnToPort: str(formData, "returnToPort"),
    freightVendor: str(formData, "freightVendor"),
    freightCost: num(formData, "freightCost"),
    broker: str(formData, "broker"),
    brokerInvoiceNumber: str(formData, "brokerInvoiceNumber"),
    budgetedBroker: num(formData, "budgetedBroker"),
    brokerRealCost: num(formData, "brokerRealCost"),
    brokerPaymentDate: str(formData, "brokerPaymentDate"),
    brokerPaid: bool(formData, "brokerPaid"),
    paymentStatus: str(formData, "paymentStatus"),
    notes: str(formData, "notes"),
  };
}

function readProjectIds(formData: FormData) {
  return formData
    .getAll("projectIds")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
}

export async function createContainer(formData: FormData) {
  const session = await requireDepartmentWrite("logistica");

  const values = readContainerValues(formData);
  const projectIds = readProjectIds(formData);

  const [row] = await db
    .insert(containers)
    .values({ ...values, createdBy: Number(session.user.id) })
    .returning({ id: containers.id });

  if (projectIds.length) {
    await db
      .insert(containerProjects)
      .values(projectIds.map((projectId) => ({ containerId: row.id, projectId })));
  }

  revalidatePath("/containers");
  revalidatePath("/");
  redirect("/containers");
}

export async function updateContainer(id: number, formData: FormData) {
  const session = await requireDepartmentWrite("logistica");

  const values = readContainerValues(formData);
  const projectIds = readProjectIds(formData);

  await db
    .update(containers)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(containers.id, id));

  await db.delete(containerProjects).where(eq(containerProjects.containerId, id));
  if (projectIds.length) {
    await db
      .insert(containerProjects)
      .values(projectIds.map((projectId) => ({ containerId: id, projectId })));
  }

  revalidatePath("/containers");
  revalidatePath(`/containers/${id}`);
  revalidatePath("/");
  redirect("/containers");
}

export async function deleteContainer(id: number) {
  const session = await requireDepartmentWrite("logistica");

  await db.delete(containers).where(eq(containers.id, id));
  revalidatePath("/containers");
  revalidatePath("/");
}

export async function saveBrokerEstimate(
  containerId: number,
  amount: number,
  confirmedFreightCost?: number,
) {
  await requireDepartmentWrite("logistica");
  if (!Number.isFinite(amount)) return;

  const values: Partial<typeof containers.$inferInsert> = {
    budgetedBroker: amount,
    updatedAt: new Date(),
  };
  // Only touches freightCost when she explicitly confirms it from the
  // calculator — otherwise re-saving a budget estimate would silently
  // overwrite a real freight cost already entered on the container.
  if (confirmedFreightCost != null && Number.isFinite(confirmedFreightCost)) {
    values.freightCost = confirmedFreightCost;
  }

  await db.update(containers).set(values).where(eq(containers.id, containerId));

  revalidatePath(`/containers/${containerId}`);
  revalidatePath("/containers");
  revalidatePath("/");
}
