"use client";

import { useMemo, useState } from "react";
import KpiDetailModal, { type KpiQuery } from "@/app/components/KpiDetailModal";

const MISSING_INVOICES_WARN_THRESHOLD = 15;

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

function shortMonthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
}

function StatCard({
  label,
  value,
  accent = false,
  warn = false,
  warnLabel,
  onClick,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
  warnLabel?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left shadow-sm transition hover:shadow-md ${
        warn ? "border-cay-red/40 bg-cay-red/5 hover:border-cay-red/60" : "border-cay-black/10 bg-white hover:border-cay-red/40"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-cay-ink/50">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent || warn ? "text-cay-red" : "text-cay-black"}`}>{value}</p>
      {warn && warnLabel && <p className="mt-0.5 text-[11px] font-medium text-cay-red">{warnLabel}</p>}
    </button>
  );
}

function BarList({
  items,
  max,
  onItemClick,
}: {
  items: { label: string; total: number }[];
  max: number;
  onItemClick?: (label: string) => void;
}) {
  if (items.length === 0) return <p className="text-sm text-cay-ink/50">Sin datos para este periodo.</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onItemClick?.(item.label)}
          className="block w-full rounded-md text-left transition hover:bg-cay-black/5"
        >
          <div className="mb-0.5 flex items-center justify-between text-xs">
            <span className="truncate text-cay-ink/80">{item.label}</span>
            <span className="shrink-0 font-medium text-cay-black">{formatAmount(item.total)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-cay-black/5">
            <div
              className="h-full rounded-full bg-cay-red"
              style={{ width: `${max > 0 ? Math.max((item.total / max) * 100, 2) : 0}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

type DashboardData = {
  kpis: {
    outstandingTotal: number;
    overdueTotal: number;
    missingInvoices: number;
    spendThisMonth: number;
  };
  spendByMonth: { month: string; total: number }[];
  topVendors: { vendor: string; total: number }[];
  spendByProject: { project: string; total: number }[];
  vendorByMonth: { month: string; vendor: string; total: number }[];
  projectByMonth: { month: string; project: string; total: number }[];
  upcomingDue: { vendor: string; poNumber: string; invoiceNumber: string | null; amount: number; dueDate: string }[];
  recentPOs: {
    vendor: string;
    poNumber: string;
    invoiceNumber: string | null;
    amount: number;
    project: string | null;
    createdAt: string;
  }[];
  recentPayments: {
    vendor: string;
    poNumber: string;
    invoiceNumber: string | null;
    amount: number;
    paidOn: string;
  }[];
};

const ALL_TIME = "all";

export default function NassauDashboard({ data }: { data: DashboardData }) {
  const maxMonth = Math.max(...data.spendByMonth.map((m) => m.total), 0);

  const months = useMemo(() => data.spendByMonth.map((m) => m.month).sort().reverse(), [data.spendByMonth]);
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_TIME);
  const [kpiDetail, setKpiDetail] = useState<KpiQuery | null>(null);

  const vendorItems = useMemo(() => {
    if (selectedMonth === ALL_TIME) return data.topVendors.map((v) => ({ label: v.vendor, total: v.total }));
    return data.vendorByMonth
      .filter((v) => v.month === selectedMonth)
      .map((v) => ({ label: v.vendor, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [selectedMonth, data.topVendors, data.vendorByMonth]);

  const projectItems = useMemo(() => {
    if (selectedMonth === ALL_TIME) return data.spendByProject.map((p) => ({ label: p.project, total: p.total }));
    return data.projectByMonth
      .filter((p) => p.month === selectedMonth)
      .map((p) => ({ label: p.project, total: p.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [selectedMonth, data.spendByProject, data.projectByMonth]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="brand-heading text-2xl text-cay-black">Dashboard</h1>
        <p className="mt-1 text-sm text-cay-ink/70">Lo mas importante de las compras de Nassau, de un vistazo.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Debemos ahora"
          value={formatAmount(data.kpis.outstandingTotal)}
          accent
          onClick={() => setKpiDetail({ type: "outstanding" })}
        />
        <StatCard
          label="Vencido"
          value={formatAmount(data.kpis.overdueTotal)}
          accent={data.kpis.overdueTotal > 0}
          onClick={() => setKpiDetail({ type: "overdue" })}
        />
        <StatCard
          label="Facturas sin montar"
          value={String(data.kpis.missingInvoices)}
          warn={data.kpis.missingInvoices > MISSING_INVOICES_WARN_THRESHOLD}
          warnLabel="Revisa y monta las facturas pendientes"
          onClick={() => setKpiDetail({ type: "missing_invoices" })}
        />
        <StatCard
          label="Gasto este mes"
          value={formatAmount(data.kpis.spendThisMonth)}
          onClick={() => setKpiDetail({ type: "spend_this_month" })}
        />
      </div>

      {kpiDetail && <KpiDetailModal query={kpiDetail} onClose={() => setKpiDetail(null)} />}

      <div className="mb-6 rounded-lg border border-cay-black/10 bg-white p-4 shadow-sm">
        <h2 className="brand-heading mb-3 text-sm text-cay-black">Gasto por mes</h2>
        {data.spendByMonth.length === 0 ? (
          <p className="text-sm text-cay-ink/50">Sin datos.</p>
        ) : (
          <div className="flex items-end gap-3" style={{ height: 140 }}>
            {data.spendByMonth.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] font-medium text-cay-black">{formatAmount(m.total)}</span>
                <div
                  className="w-full rounded-t-md bg-cay-red"
                  style={{ height: `${maxMonth > 0 ? Math.max((m.total / maxMonth) * 100, 3) : 0}px` }}
                />
                <span className="text-[11px] uppercase text-cay-ink/50">{shortMonthLabel(m.month)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="brand-heading text-sm text-cay-black">
          Top proveedores y gasto por proyecto
        </h2>
        <div>
          <label className="mr-2 text-xs font-medium uppercase tracking-wide text-cay-ink/50">Periodo</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-md border border-cay-black/20 bg-white px-2 py-1 text-sm focus:border-cay-red focus:outline-none"
          >
            <option value={ALL_TIME}>Total historico</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-cay-black/10 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-cay-black">Top proveedores</h3>
          <BarList
            items={vendorItems}
            max={Math.max(...vendorItems.map((v) => v.total), 0)}
            onItemClick={(label) =>
              setKpiDetail({
                type: "vendor",
                name: label,
                month: selectedMonth === ALL_TIME ? undefined : selectedMonth,
              })
            }
          />
        </div>
        <div className="rounded-lg border border-cay-black/10 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-cay-black">Gasto por proyecto</h3>
          <BarList
            items={projectItems}
            max={Math.max(...projectItems.map((p) => p.total), 0)}
            onItemClick={(label) =>
              setKpiDetail({
                type: "project",
                name: label,
                month: selectedMonth === ALL_TIME ? undefined : selectedMonth,
              })
            }
          />
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-cay-black/10 bg-white shadow-sm">
        <h2 className="brand-heading px-4 pt-4 text-sm text-cay-black">Proximos vencimientos (14 dias)</h2>
        {data.upcomingDue.length === 0 ? (
          <p className="p-4 text-sm text-cay-ink/50">No hay vencimientos en los proximos 14 dias.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cay-black/10 text-xs uppercase tracking-wide text-cay-ink/50">
                <th className="px-4 py-2">Vendor</th>
                <th className="px-4 py-2">P.O#</th>
                <th className="px-4 py-2">Invoice#</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {data.upcomingDue.map((row, i) => (
                <tr key={i} className="border-b border-cay-black/5 last:border-0">
                  <td className="px-4 py-1.5 text-cay-ink/80">{row.vendor}</td>
                  <td className="px-4 py-1.5 text-cay-ink/80">{row.poNumber}</td>
                  <td className="px-4 py-1.5 text-cay-ink/80">{row.invoiceNumber ?? "-"}</td>
                  <td className="px-4 py-1.5 text-cay-ink/80">{formatAmount(row.amount)}</td>
                  <td className="px-4 py-1.5 text-cay-ink/80">{formatDate(row.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-cay-black/10 bg-white shadow-sm">
          <h2 className="brand-heading px-4 pt-4 text-sm text-cay-black">Ultimas POs</h2>
          <ul className="mt-2 divide-y divide-cay-black/5">
            {data.recentPOs.map((row, i) => (
              <li key={i} className="px-4 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-cay-black">{row.vendor}</span>
                  <span className="text-cay-ink/80">{formatAmount(row.amount)}</span>
                </div>
                <p className="text-xs text-cay-ink/50">
                  {row.poNumber} &middot; {row.project ?? "-"} &middot; {formatDate(row.createdAt)}
                </p>
              </li>
            ))}
            {data.recentPOs.length === 0 && <li className="px-4 py-3 text-sm text-cay-ink/50">Sin datos.</li>}
          </ul>
        </div>
        <div className="rounded-lg border border-cay-black/10 bg-white shadow-sm">
          <h2 className="brand-heading px-4 pt-4 text-sm text-cay-black">Ultimos pagos</h2>
          <ul className="mt-2 divide-y divide-cay-black/5">
            {data.recentPayments.map((row, i) => (
              <li key={i} className="px-4 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-cay-black">{row.vendor}</span>
                  <span className="text-cay-ink/80">{formatAmount(row.amount)}</span>
                </div>
                <p className="text-xs text-cay-ink/50">
                  {row.poNumber} &middot; {row.invoiceNumber ?? "-"} &middot; {formatDate(row.paidOn)}
                </p>
              </li>
            ))}
            {data.recentPayments.length === 0 && <li className="px-4 py-3 text-sm text-cay-ink/50">Sin datos.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
