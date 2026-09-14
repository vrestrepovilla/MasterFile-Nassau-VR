import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { commercialInvoices, containers, purchases, users } from "@/lib/db/schema";

export async function getAllCommercialInvoices() {
  return db
    .select({
      id: commercialInvoices.id,
      ciNumber: commercialInvoices.ciNumber,
      fileKind: commercialInvoices.fileKind,
      fileName: commercialInvoices.fileName,
      fileSize: commercialInvoices.fileSize,
      uploadedAt: commercialInvoices.uploadedAt,
      purchaseId: commercialInvoices.purchaseId,
      containerId: commercialInvoices.containerId,
      vendor: purchases.vendor,
      project: purchases.project,
      containerNumber: containers.containerNumber,
      uploadedByName: users.name,
    })
    .from(commercialInvoices)
    .leftJoin(purchases, eq(commercialInvoices.purchaseId, purchases.id))
    .leftJoin(containers, eq(commercialInvoices.containerId, containers.id))
    .leftJoin(users, eq(commercialInvoices.uploadedBy, users.id))
    .orderBy(desc(commercialInvoices.uploadedAt));
}
