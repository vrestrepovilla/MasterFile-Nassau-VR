"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import type { DashboardFilters, PeriodFilter } from "@/lib/dashboard-metrics";
import { STATUS_OPTIONS } from "@/lib/constants";

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: "Todo el historial",
  "this-month": "Este mes",
  "last-30": "Últimos 30 días",
  ytd: "Año en curso",
};

const selectClass =
  "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand";

export function DashboardHeader({
  filters,
  onChange,
  projects,
  destinations,
  userName,
}: {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  projects: { id: number; name: string }[];
  destinations: string[];
  userName: string;
}) {
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted mt-1">Resumen general de logística</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/containers/new"
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            + Registrar contenedor
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
          value={filters.projectId}
          onChange={(e) => onChange({ ...filters, projectId: e.target.value })}
          className={selectClass}
        >
          <option value="all">Todos los proyectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filters.destination}
          onChange={(e) => onChange({ ...filters, destination: e.target.value })}
          className={selectClass}
        >
          <option value="all">Todos los destinos</option>
          {destinations.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className={selectClass}
        >
          <option value="all">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {(filters.period !== "all" ||
          filters.projectId !== "all" ||
          filters.destination !== "all" ||
          filters.status !== "all") && (
          <button
            type="button"
            onClick={() =>
              onChange({ period: "all", projectId: "all", destination: "all", status: "all" })
            }
            className="text-xs text-muted hover:text-brand px-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
