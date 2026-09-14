"use client";

import { useMemo, useState } from "react";
import { PurchasesDashboardHeader } from "./purchases-dashboard-header";
import { UpcomingPayments } from "./upcoming-payments";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ThreeMetricOverview } from "@/components/dashboard/three-metric-overview";
import { SpendAreaChart } from "@/components/dashboard/spend-area-chart";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { HorizontalBarChart } from "@/components/dashboard/horizontal-bar-chart";
import { RequiresAttention } from "@/components/dashboard/requires-attention";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import {
  DEFAULT_PURCHASES_FILTERS,
  filterPurchases,
  getProjects,
  getVendors,
  getStatuses,
  computeKpis,
  computeKpisWithTrend,
  computeMonthlySpend,
  computeSpendByAccount,
  computeTopVendors,
  computePaymentOverview,
  computeAttentionItems,
  computeUpcomingPayments,
  computeRecentActivity,
  type PurchasesFilters,
} from "@/lib/purchases-metrics";
import { formatMoney } from "@/lib/derive";
import type { PurchaseRow } from "@/lib/data/purchases";

function formatCompactMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return formatMoney(value);
}

type InvoiceForActivity = {
  id: number;
  fileName: string;
  purchaseId: number;
  vendor: string | null;
  uploadedAt: Date;
  uploadedByName: string | null;
};

export function PurchasesDashboardClient({
  purchases,
  invoices,
  usersById,
  userName,
}: {
  purchases: PurchaseRow[];
  invoices: InvoiceForActivity[];
  usersById: [number, string][];
  userName: string;
}) {
  const [filters, setFilters] = useState<PurchasesFilters>(DEFAULT_PURCHASES_FILTERS);

  const projects = useMemo(() => getProjects(purchases), [purchases]);
  const vendors = useMemo(() => getVendors(purchases), [purchases]);
  const statuses = useMemo(() => getStatuses(purchases), [purchases]);
  const filtered = useMemo(() => filterPurchases(purchases, filters), [purchases, filters]);

  const kpiTrend = useMemo(() => computeKpisWithTrend(purchases), [purchases]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const monthlySpend = useMemo(() => computeMonthlySpend(purchases), [purchases]);
  const spendByAccount = useMemo(() => computeSpendByAccount(filtered), [filtered]);
  const spendByAccountData = useMemo(
    () => spendByAccount.map((a) => ({ label: a.account, value: a.total })),
    [spendByAccount],
  );
  const topVendors = useMemo(() => computeTopVendors(filtered), [filtered]);
  const topVendorsData = useMemo(
    () => topVendors.map((v) => ({ label: v.vendor, value: v.total })),
    [topVendors],
  );
  const paymentOverview = useMemo(() => computePaymentOverview(filtered), [filtered]);

  const invoicePurchaseIds = useMemo(() => new Set(invoices.map((i) => i.purchaseId)), [invoices]);
  const attentionItems = useMemo(
    () => computeAttentionItems(filtered, invoicePurchaseIds),
    [filtered, invoicePurchaseIds],
  );
  const upcomingPayments = useMemo(() => computeUpcomingPayments(filtered), [filtered]);

  const usersMap = useMemo(() => new Map(usersById), [usersById]);
  const recentActivity = useMemo(
    () => computeRecentActivity(purchases, invoices, usersMap, 8),
    [purchases, invoices, usersMap],
  );

  return (
    <div className="space-y-6">
      <PurchasesDashboardHeader
        filters={filters}
        onChange={setFilters}
        projects={projects}
        vendors={vendors}
        statuses={statuses}
        userName={userName}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Purchases" value={String(kpis.total)} trend={kpiTrend.trends.total} />
        <KpiCard
          label="Total Amount"
          value={formatMoney(kpis.totalAmount)}
          trend={kpiTrend.trends.totalAmount}
        />
        <KpiCard label="Paid Amount" value={formatMoney(kpis.paidAmount)} />
        <KpiCard label="Pending Amount" value={formatMoney(kpis.pendingAmount)} />
        <KpiCard
          label="Overdue"
          value={String(kpis.overdueCount)}
          trend={kpiTrend.trends.overdueCount}
          goodDirection="down"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Avg / Purchase" value={kpis.avgAmount != null ? formatMoney(kpis.avgAmount) : "—"} />
        <KpiCard label="Active Vendors" value={String(kpis.vendorCount)} />
        <KpiCard label="Pending Invoice" value={String(kpis.pendingInvoiceCount)} hint="Esperando factura del proveedor" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2">
          <SpendAreaChart
            title="Monthly Purchases Spend"
            data={monthlySpend}
            series={[
              { key: "pending", name: "Pending", color: "#9aa1ac" },
              { key: "paid", name: "Paid", color: "#1f2328" },
              { key: "total", name: "Total", color: "var(--color-brand)", filled: true },
            ]}
            emptyMessage="Todavía no hay suficiente historial de compras para graficar."
          />
        </div>
        <RequiresAttention items={attentionItems} title="Requires Attention" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <ThreeMetricOverview
          title="Payment Status Overview"
          columns={[
            { label: "Total", value: formatMoney(paymentOverview.total) },
            { label: "Paid", value: formatMoney(paymentOverview.paid) },
            { label: "Pending", value: formatMoney(paymentOverview.pending) },
          ]}
          percent={paymentOverview.percentPaid}
          percentText="paid"
          emptyText="Sin compras registradas todavía"
        />
        <DonutChart
          title="Spend by Account"
          data={spendByAccountData}
          emptyMessage="No hay gastos categorizados en el período seleccionado."
          valueFormatter={(v) => formatMoney(v)}
          centerValueFormatter={(v) => formatCompactMoney(v)}
        />
      </div>

      <HorizontalBarChart title="Top Vendors" data={topVendorsData} />

      <UpcomingPayments payments={upcomingPayments} />

      <RecentActivity items={recentActivity} title="Recent Activity" />
    </div>
  );
}
