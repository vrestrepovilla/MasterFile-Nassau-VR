"use client";

import { useMemo, useState } from "react";
import { DashboardHeader } from "./dashboard-header";
import { KpiCard } from "./kpi-card";
import { ThreeMetricOverview } from "./three-metric-overview";
import { SpendAreaChart } from "./spend-area-chart";
import { DonutChart } from "./donut-chart";
import { HorizontalBarChart } from "./horizontal-bar-chart";
import { RequiresAttention } from "./requires-attention";
import { UpcomingShipments } from "./upcoming-shipments";
import { RecentActivity } from "./recent-activity";
import {
  DEFAULT_FILTERS,
  filterContainers,
  getDestinations,
  computeKpis,
  computeKpisWithTrend,
  computeMonthlySpend,
  computeStatusBreakdown,
  computeSizeBreakdown,
  computeCostByDestination,
  computeCostOverview,
  computeAttentionItems,
  computeRecentActivity,
  type DashboardFilters,
} from "@/lib/dashboard-metrics";
import { formatMoney, daysToEta } from "@/lib/derive";
import { STATUS_COLOR_HEX } from "@/lib/constants";
import type { ContainerRow } from "@/lib/data/containers";

type InvoiceForActivity = {
  id: number;
  fileName: string;
  containerId: number;
  containerNumber: string | null;
  uploadedAt: Date;
  uploadedByName: string | null;
};

export function DashboardClient({
  containers,
  invoices,
  projects,
  usersById,
  userName,
}: {
  containers: ContainerRow[];
  invoices: InvoiceForActivity[];
  projects: { id: number; name: string }[];
  usersById: [number, string][];
  userName: string;
}) {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  const destinations = useMemo(() => getDestinations(containers), [containers]);
  const filtered = useMemo(() => filterContainers(containers, filters), [containers, filters]);

  const kpiTrend = useMemo(() => computeKpisWithTrend(containers), [containers]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const monthlySpend = useMemo(() => computeMonthlySpend(containers), [containers]);
  const statusBreakdown = useMemo(() => computeStatusBreakdown(filtered), [filtered]);
  const statusDonutData = useMemo(
    () =>
      statusBreakdown.map((s) => ({
        label: s.status,
        value: s.count,
        color: STATUS_COLOR_HEX[s.status],
      })),
    [statusBreakdown],
  );
  const sizeBreakdown = useMemo(() => computeSizeBreakdown(filtered), [filtered]);
  const sizeDonutData = useMemo(
    () => sizeBreakdown.map((s) => ({ label: s.size, value: s.count })),
    [sizeBreakdown],
  );
  const costByDestination = useMemo(() => computeCostByDestination(filtered), [filtered]);
  const costByDestinationData = useMemo(
    () => costByDestination.map((d) => ({ label: d.destination, value: d.total })),
    [costByDestination],
  );
  const costOverview = useMemo(() => computeCostOverview(filtered), [filtered]);

  const invoiceContainerIds = useMemo(() => new Set(invoices.map((i) => i.containerId)), [invoices]);
  const attentionItems = useMemo(
    () => computeAttentionItems(filtered, invoiceContainerIds),
    [filtered, invoiceContainerIds],
  );

  const upcoming = useMemo(() => {
    return filtered
      .filter((c) => c.status !== "Delivered" && c.eta)
      .map((c) => ({ ...c, days: daysToEta(c.eta) }))
      .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity))
      .slice(0, 6);
  }, [filtered]);

  const usersMap = useMemo(() => new Map(usersById), [usersById]);
  const recentActivity = useMemo(
    () => computeRecentActivity(containers, invoices, usersMap, 8),
    [containers, invoices, usersMap],
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        filters={filters}
        onChange={setFilters}
        projects={projects}
        destinations={destinations}
        userName={userName}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Containers" value={String(kpis.total)} trend={kpiTrend.trends.total} />
        <KpiCard label="Active" value={String(kpis.active)} hint="En proceso, sin entregar" />
        <KpiCard
          label="On-Time Delivery"
          value={kpis.onTimeDeliveryRate != null ? `${kpis.onTimeDeliveryRate.toFixed(0)}%` : "—"}
          emptyNote={kpis.onTimeDeliveryRate == null ? "Falta fecha real de entrega" : undefined}
        />
        <KpiCard
          label="Delayed"
          value={String(kpis.delayed)}
          trend={kpiTrend.trends.delayed}
          goodDirection="down"
        />
        <KpiCard
          label="Avg Cost / Container"
          value={kpis.avgCostPerContainer != null ? formatMoney(kpis.avgCostPerContainer) : "—"}
          trend={kpiTrend.trends.avgCostPerContainer}
          goodDirection="down"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Delivered" value={String(kpis.delivered)} trend={kpiTrend.trends.delivered} />
        <KpiCard label="Awaiting Customs" value={String(kpis.awaitingCustoms)} />
        <KpiCard
          label="Avg Days at Port"
          value={kpis.avgDaysAtPort != null ? kpis.avgDaysAtPort.toFixed(1) : "—"}
          emptyNote={kpis.avgDaysAtPort == null ? "Falta fecha real de arribo/salida de puerto" : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2">
          <SpendAreaChart
            title="Monthly Logistics Spend"
            data={monthlySpend}
            series={[
              { key: "freight", name: "Freight", color: "#9aa1ac" },
              { key: "broker", name: "Broker", color: "#1f2328" },
              { key: "total", name: "Total", color: "var(--color-brand)", filled: true },
            ]}
            emptyMessage="Todavía no hay suficiente historial de costos para graficar."
          />
        </div>
        <RequiresAttention items={attentionItems} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <ThreeMetricOverview
          title="Logistics Cost Overview"
          columns={[
            { label: "Budget", value: formatMoney(costOverview.budget) },
            { label: "Actual", value: formatMoney(costOverview.actual) },
            {
              label: "Remaining",
              value: formatMoney(costOverview.remaining),
              danger: costOverview.remaining < 0,
            },
          ]}
          percent={costOverview.percentUsed}
          percentText="used"
          emptyText="Sin presupuesto asignado todavía"
          danger={costOverview.remaining < 0}
        />
        <DonutChart
          title="Containers by Status"
          data={statusDonutData}
          unitLabel=" contenedor(es)"
          emptyMessage="No hay contenedores en el período seleccionado."
        />
        <DonutChart
          title="Containers by Type"
          data={sizeDonutData}
          unitLabel=" contenedor(es)"
          emptyMessage="No hay contenedores en el período seleccionado."
        />
      </div>

      <HorizontalBarChart title="Cost by Destination" data={costByDestinationData} />

      <UpcomingShipments shipments={upcoming} />

      <RecentActivity items={recentActivity} />
    </div>
  );
}
