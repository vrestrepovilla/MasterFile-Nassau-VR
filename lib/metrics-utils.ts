// Shared helpers for the Logística and Compras dashboards — period windows,
// month-over-month trend math, monthly bucketing, and relative timestamps.

export type PeriodFilter = "all" | "this-month" | "last-30" | "ytd";

export function isWithinPeriod(date: Date, period: PeriodFilter, now: Date): boolean {
  if (period === "all") return true;
  if (period === "this-month") {
    return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
  }
  if (period === "last-30") {
    const diffDays = (now.getTime() - date.getTime()) / 86_400_000;
    return diffDays >= 0 && diffDays <= 30;
  }
  if (period === "ytd") {
    return date.getUTCFullYear() === now.getUTCFullYear() && date.getTime() <= now.getTime();
  }
  return true;
}

export type TrendDirection = "up" | "down" | "flat" | "none";

export type Trend = {
  direction: TrendDirection;
  changePercent: number | null; // null when there's nothing to compare against
};

export function computeTrend(current: number, previous: number): Trend {
  if (previous === 0) {
    if (current === 0) return { direction: "none", changePercent: null };
    return { direction: "up", changePercent: null }; // can't express % change from zero
  }
  const changePercent = ((current - previous) / previous) * 100;
  if (Math.abs(changePercent) < 0.05) return { direction: "flat", changePercent: 0 };
  return { direction: changePercent > 0 ? "up" : "down", changePercent };
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

export function previousMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

/** Generates the last `months` calendar-month buckets (oldest first, current month last). */
export function lastNMonths(months: number, now: Date): Date[] {
  const result: Date[] = [];
  for (let i = months - 1; i >= 0; i--) {
    result.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)));
  }
  return result;
}

export type AttentionPriority = "high" | "medium";

export type AttentionItem = {
  id: string;
  priority: AttentionPriority;
  label: string; // e.g. container number, PO#, or vendor name
  description: string;
  actionHref: string | null;
  actionLabel: string | null;
};

export function sortByPriority(items: AttentionItem[]): AttentionItem[] {
  const rank: Record<AttentionPriority, number> = { high: 0, medium: 1 };
  return [...items].sort((a, b) => rank[a.priority] - rank[b.priority]);
}

export type ActivityItem = {
  id: string;
  timestamp: Date;
  description: string;
  userName: string | null;
};

export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "Ahora mismo";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(date);
}
