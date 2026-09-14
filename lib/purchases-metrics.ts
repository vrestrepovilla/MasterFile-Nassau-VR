import type { PurchaseRow } from "@/lib/data/purchases";
import {
  computeTrend,
  isWithinPeriod,
  lastNMonths,
  monthKey,
  monthLabel,
  sortByPriority,
  type ActivityItem,
  type AttentionItem,
  type PeriodFilter,
  type Trend,
} from "@/lib/metrics-utils";

export type { ActivityItem, AttentionItem, AttentionPriority, PeriodFilter, Trend } from "@/lib/metrics-utils";
export { relativeTime } from "@/lib/metrics-utils";

export type PurchasesFilters = {
  period: PeriodFilter;
  project: string; // "all" or exact project text
  vendor: string; // "all" or exact vendor text
  status: string; // "all" or exact status text
};

export const DEFAULT_PURCHASES_FILTERS: PurchasesFilters = {
  period: "all",
  project: "all",
  vendor: "all",
  status: "all",
};

const PAID_STATUSES = new Set(["Paid"]);
const CLOSED_STATUSES = new Set(["Paid", "Cancelled"]);

// The real-world date a purchase is anchored to for period filtering and
// monthly charts. Falls back to createdAt when there's no due date yet.
function anchorDate(p: PurchaseRow): Date {
  return new Date(`${p.dueDate ?? p.createdAt.toISOString().slice(0, 10)}T00:00:00Z`);
}

export function getProjects(purchases: PurchaseRow[]): string[] {
  return Array.from(new Set(purchases.map((p) => p.project).filter((v): v is string => Boolean(v)))).sort();
}

export function getVendors(purchases: PurchaseRow[]): string[] {
  return Array.from(new Set(purchases.map((p) => p.vendor).filter((v): v is string => Boolean(v)))).sort();
}

export function getStatuses(purchases: PurchaseRow[]): string[] {
  return Array.from(new Set(purchases.map((p) => p.status).filter((v): v is string => Boolean(v)))).sort();
}

export function filterPurchases(
  purchases: PurchaseRow[],
  filters: PurchasesFilters,
  now: Date = new Date(),
): PurchaseRow[] {
  return purchases.filter((p) => {
    if (!isWithinPeriod(anchorDate(p), filters.period, now)) return false;
    if (filters.project !== "all" && p.project !== filters.project) return false;
    if (filters.vendor !== "all" && p.vendor !== filters.vendor) return false;
    if (filters.status !== "all" && p.status !== filters.status) return false;
    return true;
  });
}

export type PurchasesKpis = {
  total: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueCount: number;
  avgAmount: number | null;
  pendingInvoiceCount: number;
  vendorCount: number;
};

export function computeKpis(purchases: PurchaseRow[], now: Date = new Date()): PurchasesKpis {
  const total = purchases.length;
  let totalAmount = 0;
  let paidAmount = 0;
  let overdueCount = 0;
  let amountCount = 0;
  let pendingInvoiceCount = 0;
  const vendors = new Set<string>();

  for (const p of purchases) {
    const amount = p.amount ?? 0;
    totalAmount += amount;
    if (p.amount != null) amountCount += 1;
    if (p.status && PAID_STATUSES.has(p.status)) paidAmount += amount;
    if (p.status === "Pending invoice") pendingInvoiceCount += 1;
    if (p.vendor) vendors.add(p.vendor);

    if (
      p.dueDate &&
      !(p.status && CLOSED_STATUSES.has(p.status)) &&
      new Date(`${p.dueDate}T00:00:00Z`).getTime() < now.getTime()
    ) {
      overdueCount += 1;
    }
  }

  return {
    total,
    totalAmount,
    paidAmount,
    pendingAmount: totalAmount - paidAmount,
    overdueCount,
    avgAmount: amountCount > 0 ? totalAmount / amountCount : null,
    pendingInvoiceCount,
    vendorCount: vendors.size,
  };
}

export type PurchasesKpiWithTrend = PurchasesKpis & {
  trends: Partial<Record<keyof PurchasesKpis, Trend>>;
};

export function computeKpisWithTrend(allPurchases: PurchaseRow[], now: Date = new Date()): PurchasesKpiWithTrend {
  const thisMonth = allPurchases.filter((p) => isWithinPeriod(anchorDate(p), "this-month", now));
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonth = allPurchases.filter((p) => {
    const d = anchorDate(p);
    return d.getUTCFullYear() === lastMonthDate.getUTCFullYear() && d.getUTCMonth() === lastMonthDate.getUTCMonth();
  });

  const current = computeKpis(thisMonth, now);
  const previous = computeKpis(lastMonth, now);

  const trends: Partial<Record<keyof PurchasesKpis, Trend>> = {
    total: computeTrend(current.total, previous.total),
    totalAmount: computeTrend(current.totalAmount, previous.totalAmount),
    overdueCount: computeTrend(current.overdueCount, previous.overdueCount),
  };

  return { ...computeKpis(allPurchases, now), trends };
}

export type MonthlySpendPoint = {
  key: string;
  label: string;
  paid: number;
  pending: number;
  total: number;
};

export function computeMonthlySpend(
  purchases: PurchaseRow[],
  months = 6,
  now: Date = new Date(),
): MonthlySpendPoint[] {
  const buckets: MonthlySpendPoint[] = lastNMonths(months, now).map((d) => ({
    key: monthKey(d),
    label: monthLabel(d),
    paid: 0,
    pending: 0,
    total: 0,
  }));
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const p of purchases) {
    const bucket = byKey.get(monthKey(anchorDate(p)));
    if (!bucket) continue;
    const amount = p.amount ?? 0;
    if (p.status && PAID_STATUSES.has(p.status)) bucket.paid += amount;
    else bucket.pending += amount;
    bucket.total += amount;
  }

  return buckets;
}

export type AccountSpend = { account: string; total: number; count: number };

export function computeSpendByAccount(purchases: PurchaseRow[]): AccountSpend[] {
  const byAccount = new Map<string, AccountSpend>();
  for (const p of purchases) {
    const account = p.account ?? "Sin categoría";
    const entry = byAccount.get(account) ?? { account, total: 0, count: 0 };
    entry.total += p.amount ?? 0;
    entry.count += 1;
    byAccount.set(account, entry);
  }
  return Array.from(byAccount.values()).sort((a, b) => b.total - a.total);
}

export type VendorSpend = { vendor: string; total: number; count: number };

export function computeTopVendors(purchases: PurchaseRow[], limit = 6): VendorSpend[] {
  const byVendor = new Map<string, VendorSpend>();
  for (const p of purchases) {
    const vendor = p.vendor ?? "Sin vendedor";
    const entry = byVendor.get(vendor) ?? { vendor, total: 0, count: 0 };
    entry.total += p.amount ?? 0;
    entry.count += 1;
    byVendor.set(vendor, entry);
  }
  return Array.from(byVendor.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export type PaymentOverview = {
  total: number;
  paid: number;
  pending: number;
  percentPaid: number | null;
};

export function computePaymentOverview(purchases: PurchaseRow[]): PaymentOverview {
  const total = purchases.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const paid = purchases
    .filter((p) => p.status && PAID_STATUSES.has(p.status))
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const pending = total - paid;
  const percentPaid = total > 0 ? (paid / total) * 100 : null;
  return { total, paid, pending, percentPaid };
}

const OVERDUE_HIGH_THRESHOLD_DAYS = 14;

export function computeAttentionItems(
  purchases: PurchaseRow[],
  invoicePurchaseIds: Set<number>,
  now: Date = new Date(),
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const p of purchases) {
    const label = p.vendor ?? p.invoiceNumber ?? `Compra #${p.id}`;
    const editHref = `/compras/purchases/${p.id}`;

    if (p.dueDate && !(p.status && CLOSED_STATUSES.has(p.status))) {
      const overdueDays = Math.round(
        (now.getTime() - new Date(`${p.dueDate}T00:00:00Z`).getTime()) / 86_400_000,
      );
      if (overdueDays > 0) {
        items.push({
          id: `overdue-${p.id}`,
          priority: overdueDays >= OVERDUE_HIGH_THRESHOLD_DAYS ? "high" : "medium",
          label,
          description: `Factura vencida hace ${overdueDays} día(s)${p.amount != null ? ` — ${p.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}` : ""}`,
          actionHref: editHref,
          actionLabel: "Revisar",
        });
      }
    }

    if (p.status === "Pending invoice") {
      items.push({
        id: `pending-invoice-${p.id}`,
        priority: "medium",
        label,
        description: "Factura pendiente de recibir del proveedor",
        actionHref: editHref,
        actionLabel: "Ver compra",
      });
    }

    // Only applies to purchases created in the app going forward — the bulk
    // import (source "2026"/"past") predates file uploads entirely, so
    // flagging all of it would just be noise, not something to act on.
    if (
      p.source === "manual" &&
      p.status &&
      PAID_STATUSES.has(p.status) &&
      p.amount != null &&
      p.amount > 0 &&
      !invoicePurchaseIds.has(p.id)
    ) {
      items.push({
        id: `missing-file-${p.id}`,
        priority: "medium",
        label,
        description: "Pagada, pero sin factura adjunta",
        actionHref: editHref,
        actionLabel: "Subir factura",
      });
    }
  }

  return sortByPriority(items);
}

export function computeUpcomingPayments(purchases: PurchaseRow[], limit = 6): PurchaseRow[] {
  return purchases
    .filter((p) => p.dueDate && !(p.status && CLOSED_STATUSES.has(p.status)))
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, limit);
}

export function computeRecentActivity(
  purchases: PurchaseRow[],
  invoices: { id: number; fileName: string; vendor: string | null; uploadedAt: Date; uploadedByName: string | null }[],
  usersById: Map<number, string>,
  limit = 8,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const p of purchases) {
    if (p.source !== "manual") continue; // imported rows would flood the feed with the same timestamp
    items.push({
      id: `created-${p.id}`,
      timestamp: p.createdAt,
      description: `Compra de ${p.vendor ?? "proveedor"} registrada`,
      userName: p.createdBy != null ? (usersById.get(p.createdBy) ?? null) : null,
    });
  }

  for (const inv of invoices) {
    items.push({
      id: `invoice-${inv.id}`,
      timestamp: inv.uploadedAt,
      description: `Factura "${inv.fileName}" subida para ${inv.vendor ?? "una compra"}`,
      userName: inv.uploadedByName,
    });
  }

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}
