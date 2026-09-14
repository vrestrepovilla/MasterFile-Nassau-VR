import type { ContainerRow } from "@/lib/data/containers";
import { STATUS_OPTIONS } from "@/lib/constants";
import { daysToEta, totalLogistics } from "@/lib/derive";
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

export type {
  ActivityItem,
  AttentionItem,
  AttentionPriority,
  PeriodFilter,
  Trend,
  TrendDirection,
} from "@/lib/metrics-utils";
export { relativeTime } from "@/lib/metrics-utils";

export type DashboardFilters = {
  period: PeriodFilter;
  projectId: string; // "all" or project id as string
  destination: string; // "all" or portOfDischarge value
  status: string; // "all" or a Status value
};

export const DEFAULT_FILTERS: DashboardFilters = {
  period: "all",
  projectId: "all",
  destination: "all",
  status: "all",
};

// The real-world date a container's logistics activity is anchored to.
// Falls back to createdAt for containers that don't have an ETD yet.
function anchorDate(c: ContainerRow): Date {
  return new Date(`${c.etd ?? c.createdAt.toISOString().slice(0, 10)}T00:00:00Z`);
}

export function getDestinations(containers: ContainerRow[]): string[] {
  const set = new Set<string>();
  for (const c of containers) {
    if (c.portOfDischarge) set.add(c.portOfDischarge);
  }
  return Array.from(set).sort();
}

export function filterContainers(
  containers: ContainerRow[],
  filters: DashboardFilters,
  now: Date = new Date(),
): ContainerRow[] {
  return containers.filter((c) => {
    if (!isWithinPeriod(anchorDate(c), filters.period, now)) return false;
    if (filters.projectId !== "all" && !c.projects.some((p) => String(p.id) === filters.projectId)) {
      return false;
    }
    if (filters.destination !== "all" && c.portOfDischarge !== filters.destination) return false;
    if (filters.status !== "all" && c.status !== filters.status) return false;
    return true;
  });
}

export type DashboardKpis = {
  total: number;
  active: number;
  delivered: number;
  delayed: number;
  awaitingCustoms: number;
  avgCostPerContainer: number | null;
  onTimeDeliveryRate: number | null; // needs an actual-arrival date we don't track yet
  avgDaysAtPort: number | null; // needs actual port in/out timestamps we don't track yet
};

export function computeKpis(containers: ContainerRow[]): DashboardKpis {
  const total = containers.length;
  const delivered = containers.filter((c) => c.status === "Delivered").length;
  const delayed = containers.filter((c) => c.status === "Delayed").length;
  const awaitingCustoms = containers.filter((c) => c.status === "Customs").length;
  const active = total - delivered;

  const costed = containers.filter((c) => c.freightCost != null || c.brokerRealCost != null);
  const avgCostPerContainer =
    costed.length === 0
      ? null
      : costed.reduce((sum, c) => sum + totalLogistics(c.freightCost, c.brokerRealCost), 0) / costed.length;

  return {
    total,
    active,
    delivered,
    delayed,
    awaitingCustoms,
    avgCostPerContainer,
    onTimeDeliveryRate: null,
    avgDaysAtPort: null,
  };
}

export type KpiWithTrend = DashboardKpis & {
  trends: Partial<Record<keyof DashboardKpis, Trend>>;
};

export function computeKpisWithTrend(allContainers: ContainerRow[], now: Date = new Date()): KpiWithTrend {
  const thisMonth = allContainers.filter((c) => isWithinPeriod(anchorDate(c), "this-month", now));
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonth = allContainers.filter((c) => {
    const d = anchorDate(c);
    return d.getUTCFullYear() === lastMonthDate.getUTCFullYear() && d.getUTCMonth() === lastMonthDate.getUTCMonth();
  });

  const current = computeKpis(thisMonth);
  const previous = computeKpis(lastMonth);

  const trends: Partial<Record<keyof DashboardKpis, Trend>> = {
    total: computeTrend(current.total, previous.total),
    delivered: computeTrend(current.delivered, previous.delivered),
    delayed: computeTrend(current.delayed, previous.delayed),
  };
  if (current.avgCostPerContainer != null && previous.avgCostPerContainer != null) {
    trends.avgCostPerContainer = computeTrend(current.avgCostPerContainer, previous.avgCostPerContainer);
  }

  return { ...computeKpis(allContainers), trends };
}

export type MonthlySpendPoint = {
  key: string; // e.g. "2026-08"
  label: string; // e.g. "Aug"
  freight: number;
  broker: number;
  total: number;
};

export function computeMonthlySpend(containers: ContainerRow[], months = 6, now: Date = new Date()): MonthlySpendPoint[] {
  const buckets: MonthlySpendPoint[] = lastNMonths(months, now).map((d) => ({
    key: monthKey(d),
    label: monthLabel(d),
    freight: 0,
    broker: 0,
    total: 0,
  }));
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const c of containers) {
    const bucket = byKey.get(monthKey(anchorDate(c)));
    if (!bucket) continue;
    bucket.freight += c.freightCost ?? 0;
    bucket.broker += c.brokerRealCost ?? 0;
    bucket.total += totalLogistics(c.freightCost, c.brokerRealCost);
  }

  return buckets;
}

export type StatusCount = { status: string; count: number };

export function computeStatusBreakdown(containers: ContainerRow[]): StatusCount[] {
  const byStatus = new Map<string, number>(STATUS_OPTIONS.map((s) => [s, 0]));
  for (const c of containers) {
    byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
  }
  return STATUS_OPTIONS.map((s) => ({ status: s, count: byStatus.get(s) ?? 0 }));
}

export type SizeCount = { size: string; count: number };

// `size` is free text (LCL, 20ft, 40ft, "Flat Rack 40 ft", etc. — see
// lib/constants.ts SIZE_SUGGESTIONS for common values), not a fixed enum
// like status, so the breakdown is built from whatever values are actually
// present rather than a predefined list.
export function computeSizeBreakdown(containers: ContainerRow[]): SizeCount[] {
  const bySize = new Map<string, number>();
  for (const c of containers) {
    const size = c.size?.trim() || "Sin definir";
    bySize.set(size, (bySize.get(size) ?? 0) + 1);
  }
  return Array.from(bySize.entries())
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.count - a.count);
}

export type DestinationCost = { destination: string; total: number; count: number };

export function computeCostByDestination(containers: ContainerRow[]): DestinationCost[] {
  const byDest = new Map<string, DestinationCost>();
  for (const c of containers) {
    const dest = c.portOfDischarge ?? "Sin destino";
    const entry = byDest.get(dest) ?? { destination: dest, total: 0, count: 0 };
    entry.total += totalLogistics(c.freightCost, c.brokerRealCost);
    entry.count += 1;
    byDest.set(dest, entry);
  }
  return Array.from(byDest.values()).sort((a, b) => b.total - a.total);
}

export type LogisticsCostOverview = {
  budget: number;
  actual: number;
  remaining: number;
  percentUsed: number | null;
};

export function computeCostOverview(containers: ContainerRow[]): LogisticsCostOverview {
  const budget = containers.reduce((sum, c) => sum + (c.budgetedBroker ?? 0), 0);
  const actual = containers.reduce(
    (sum, c) => sum + (c.freightCost ?? 0) + (c.brokerRealCost ?? 0),
    0,
  );
  const remaining = budget - actual;
  const percentUsed = budget > 0 ? (actual / budget) * 100 : null;
  return { budget, actual, remaining, percentUsed };
}

const PORT_OVERDUE_THRESHOLD_DAYS = 5;

export function computeAttentionItems(
  containers: ContainerRow[],
  invoiceContainerIds: Set<number>,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const c of containers) {
    const label = c.containerNumber ?? `Contenedor #${c.id}`;
    const editHref = `/containers/${c.id}`;

    if (c.status === "Delayed") {
      items.push({
        id: `delayed-${c.id}`,
        priority: "high",
        label,
        description: "Marcado como retrasado",
        actionHref: editHref,
        actionLabel: "Ver contenedor",
      });
    }

    const eta = daysToEta(c.eta);
    if (eta != null && eta < 0 && c.status !== "Delivered" && c.status !== "Delayed") {
      const overdueBy = Math.abs(eta);
      items.push({
        id: `eta-overdue-${c.id}`,
        priority: overdueBy >= PORT_OVERDUE_THRESHOLD_DAYS ? "high" : "medium",
        label,
        description:
          c.status === "Arrived at Port"
            ? `En puerto ${overdueBy} día(s) después del ETA`
            : `ETA vencido hace ${overdueBy} día(s)`,
        actionHref: editHref,
        actionLabel: "Ver contenedor",
      });
    }

    if (!c.containerNumber) {
      items.push({
        id: `no-number-${c.id}`,
        priority: "medium",
        label: `#${c.id}`,
        description: "Contenedor sin número asignado",
        actionHref: editHref,
        actionLabel: "Completar",
      });
    }

    if (
      (c.status === "Arrived at Port" || c.status === "Customs" || c.status === "Delivered") &&
      !invoiceContainerIds.has(c.id)
    ) {
      items.push({
        id: `missing-invoice-${c.id}`,
        priority: "medium",
        label,
        description: "Sin factura de broker adjunta",
        actionHref: editHref,
        actionLabel: "Subir factura",
      });
    }

    if (c.brokerRealCost != null && c.budgetedBroker != null && c.brokerRealCost > c.budgetedBroker) {
      items.push({
        id: `over-budget-${c.id}`,
        priority: "high",
        label,
        description: `Costo de broker superó lo presupuestado por ${(
          c.brokerRealCost - c.budgetedBroker
        ).toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
        actionHref: editHref,
        actionLabel: "Revisar",
      });
    }
  }

  return sortByPriority(items);
}

export function computeRecentActivity(
  containers: ContainerRow[],
  invoices: { id: number; fileName: string; containerNumber: string | null; uploadedAt: Date; uploadedByName: string | null }[],
  usersById: Map<number, string>,
  limit = 8,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const c of containers) {
    items.push({
      id: `created-${c.id}`,
      timestamp: c.createdAt,
      description: `Contenedor ${c.containerNumber ?? `#${c.id}`} registrado`,
      userName: c.createdBy != null ? (usersById.get(c.createdBy) ?? null) : null,
    });
    if (c.status === "Delivered") {
      items.push({
        id: `delivered-${c.id}`,
        timestamp: c.updatedAt,
        description: `Contenedor ${c.containerNumber ?? `#${c.id}`} marcado como entregado`,
        userName: null,
      });
    }
  }

  for (const inv of invoices) {
    items.push({
      id: `invoice-${inv.id}`,
      timestamp: inv.uploadedAt,
      description: `Factura "${inv.fileName}" subida para ${inv.containerNumber ?? "un contenedor"}`,
      userName: inv.uploadedByName,
    });
  }

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}
