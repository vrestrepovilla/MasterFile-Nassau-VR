import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brokerInvoices, containers, users } from "@/lib/db/schema";

export async function getBrokerInvoices(containerId: number) {
  return db
    .select({
      id: brokerInvoices.id,
      label: brokerInvoices.label,
      ciNumber: brokerInvoices.ciNumber,
      fileName: brokerInvoices.fileName,
      mimeType: brokerInvoices.mimeType,
      fileSize: brokerInvoices.fileSize,
      uploadedAt: brokerInvoices.uploadedAt,
    })
    .from(brokerInvoices)
    .where(eq(brokerInvoices.containerId, containerId))
    .orderBy(asc(brokerInvoices.uploadedAt));
}

export async function getBrokerInvoiceSummaries(): Promise<
  { containerId: number; count: number; firstId: number }[]
> {
  const rows = await db
    .select({
      containerId: brokerInvoices.containerId,
      id: brokerInvoices.id,
    })
    .from(brokerInvoices)
    .orderBy(asc(brokerInvoices.uploadedAt));

  const map = new Map<number, { count: number; firstId: number }>();
  for (const row of rows) {
    const existing = map.get(row.containerId);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(row.containerId, { count: 1, firstId: row.id });
    }
  }
  return Array.from(map.entries()).map(([containerId, v]) => ({ containerId, ...v }));
}

export async function getAllBrokerInvoices() {
  return db
    .select({
      id: brokerInvoices.id,
      label: brokerInvoices.label,
      ciNumber: brokerInvoices.ciNumber,
      fileName: brokerInvoices.fileName,
      mimeType: brokerInvoices.mimeType,
      fileSize: brokerInvoices.fileSize,
      uploadedAt: brokerInvoices.uploadedAt,
      containerId: brokerInvoices.containerId,
      containerNumber: containers.containerNumber,
      containerCiNumbers: containers.ciNumbers,
      broker: containers.broker,
      uploadedByName: users.name,
    })
    .from(brokerInvoices)
    .innerJoin(containers, eq(brokerInvoices.containerId, containers.id))
    .leftJoin(users, eq(brokerInvoices.uploadedBy, users.id))
    .orderBy(desc(brokerInvoices.uploadedAt));
}
