import { and, desc, eq, inArray, isNull, notInArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { nassauInvoiceMatches, nassauMasterFileEntries, nassauPaymentReceipts } from "@/lib/db/schema";
import { OUTSTANDING_INVOICE_VENDORS, sortByInvoiceNumber } from "@/lib/nassau/outstanding";

export type NassauEntryRow = typeof nassauMasterFileEntries.$inferSelect;

export async function getNassauEntries(): Promise<NassauEntryRow[]> {
  return db
    .select()
    .from(nassauMasterFileEntries)
    .orderBy(desc(nassauMasterFileEntries.createdAt));
}

export async function getNassauEntryById(id: string): Promise<NassauEntryRow | null> {
  const [row] = await db
    .select()
    .from(nassauMasterFileEntries)
    .where(eq(nassauMasterFileEntries.id, id));
  return row ?? null;
}

export async function getPendingNassauInvoiceMatches() {
  return db
    .select({
      id: nassauInvoiceMatches.id,
      fromEmail: nassauInvoiceMatches.fromEmail,
      subject: nassauInvoiceMatches.subject,
      receivedAt: nassauInvoiceMatches.receivedAt,
      attachmentFileName: nassauInvoiceMatches.attachmentFileName,
      extractedInvoiceNumber: nassauInvoiceMatches.extractedInvoiceNumber,
      suggestedEntryId: nassauInvoiceMatches.suggestedEntryId,
      suggestedVendor: nassauMasterFileEntries.vendor,
      suggestedPoNumber: nassauMasterFileEntries.poNumber,
      suggestedAmount: nassauMasterFileEntries.amount,
    })
    .from(nassauInvoiceMatches)
    .leftJoin(nassauMasterFileEntries, eq(nassauInvoiceMatches.suggestedEntryId, nassauMasterFileEntries.id))
    .where(eq(nassauInvoiceMatches.status, "pending"))
    .orderBy(desc(nassauInvoiceMatches.receivedAt));
}

export async function getOutstandingNassauInvoices() {
  const rows = await db
    .select()
    .from(nassauMasterFileEntries)
    .where(
      and(
        inArray(nassauMasterFileEntries.vendor, [...OUTSTANDING_INVOICE_VENDORS]),
        or(
          isNull(nassauMasterFileEntries.paymentStatus),
          notInArray(nassauMasterFileEntries.paymentStatus, ["Paid", "Cancelled"]),
        ),
      ),
    );

  return OUTSTANDING_INVOICE_VENDORS.map((vendor) => ({
    vendor,
    entries: sortByInvoiceNumber(rows.filter((e) => e.vendor === vendor)),
  }));
}

export async function getNassauPaymentReceiptsByVendor(vendor: string) {
  return db
    .select()
    .from(nassauPaymentReceipts)
    .where(eq(nassauPaymentReceipts.vendor, vendor))
    .orderBy(desc(nassauPaymentReceipts.paidOn));
}
