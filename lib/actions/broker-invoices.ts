"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireDepartmentWrite } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { brokerInvoices } from "@/lib/db/schema";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadBrokerInvoice(containerId: number, formData: FormData) {
  const session = await requireDepartmentWrite("logistica");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_FILE_SIZE) return;

  const label = String(formData.get("label") ?? "").trim() || null;
  const ciNumber = String(formData.get("ciNumber") ?? "").trim() || null;
  const buffer = Buffer.from(await file.arrayBuffer());

  await db.insert(brokerInvoices).values({
    containerId,
    label,
    ciNumber,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    fileData: buffer.toString("base64"),
    uploadedBy: Number(session.user.id),
  });

  revalidatePath(`/containers/${containerId}`);
}

export async function deleteBrokerInvoice(id: number, containerId: number) {
  const session = await requireDepartmentWrite("logistica");

  await db.delete(brokerInvoices).where(eq(brokerInvoices.id, id));
  revalidatePath(`/containers/${containerId}`);
}
