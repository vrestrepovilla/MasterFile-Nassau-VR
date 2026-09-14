"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import type { PeriodFilter, PurchasesFilters } from "@/lib/purchases-metrics";

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: "Todo el historial",
  "this-month": "Este mes",
  "last-30": "Últimos 30 días",
  ytd: "Año en curso",
};

const selectClass =
  "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand";

export function PurchasesDashboardHeader({
  filters,
  onChange,
  projects,
  vendors,
  statuses,
  userName,
}: {
  filters: PurchasesFilters;
  onChange: (next: PurchasesFilters) => void;
  projects: string[];
  vendors: string[];
  statuses: string[];
  userName: string;
}) {
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hasActiveFilters =
    filters.period !== "all" || filters.project !== "all" || filters.vendor !== "all" || filters.status !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard de Compras</h1>
          <p className="text-sm text-muted mt-1">Resumen general de compras y facturas de proveedores</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/compras/purchases/new"
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            + Nueva compra
          </Link>
          <button
            type="button"
            title="No hay notificaciones nuevas"
            className="size-9 grid place-items-center rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:bg-background transition-colors"
          >
            <Bell className="size-4" />
          </button>
          <div
            className="size-9 grid place-items-center rounded-full bg-ink text-white text-xs font-semibold shrink-0"
            title={userName}
          >
            {initials || "?"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.period}
          onChange={(e) => onChange({ ...filters, period: e.target.value as PeriodFilter })}
          className={selectClass}
        >
          {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          value={filters.project}
          onChange={(e) => onChange({ ...filters, project: e.target.value })}
          className={selectClass}
        >
          <option value="all">Todos los proyectos</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filters.vendor}
          onChange={(e) => onChange({ ...filters, vendor: e.target.value })}
          className={selectClass}
        >
          <option value="all">Todos los vendedores</option>
          {vendors.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className={selectClass}
        >
          <option value="all">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange({ period: "all", project: "all", vendor: "all", status: "all" })}
            className="text-xs text-muted hover:text-brand px-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
