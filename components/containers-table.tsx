"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Paperclip } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { DeleteButton } from "@/components/delete-button";
import { deleteContainer } from "@/lib/actions/containers";
import { formatDate, formatMoney, totalLogistics } from "@/lib/derive";
import { STATUS_OPTIONS } from "@/lib/constants";
import type { ContainerRow, ProjectRow } from "@/lib/data/containers";

type ContainerGroup = {
  key: string;
  ciNumbers: string | null;
  rows: ContainerRow[];
};

// Rows sharing a single numeric CI# are sorted next to each other by the
// server, so a linear scan is enough to group them — this is how one
// Commercial Invoice covering several containers shows up as one row with
// its containers nested underneath, mirroring the P.O./WR grouping.
function groupByCiNumber(rows: ContainerRow[]): ContainerGroup[] {
  const groups: ContainerGroup[] = [];
  let i = 0;
  while (i < rows.length) {
    const ci = rows[i].ciNumbers;
    if (ci && /^[0-9]+$/.test(ci)) {
      let j = i + 1;
      while (j < rows.length && rows[j].ciNumbers === ci) j++;
      groups.push({ key: `ci-${ci}-${rows[i].id}`, ciNumbers: ci, rows: rows.slice(i, j) });
      i = j;
    } else {
      groups.push({ key: `single-${rows[i].id}`, ciNumbers: ci, rows: [rows[i]] });
      i++;
    }
  }
  return groups;
}

export function ContainersTable({
  containers,
  projects,
  canDelete,
  canEdit,
  invoicesByContainer,
}: {
  containers: ContainerRow[];
  projects: ProjectRow[];
  canDelete: boolean;
  canEdit: boolean;
  invoicesByContainer: Record<number, { count: number; firstId: number }>;
}) {
  const [status, setStatus] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return containers.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (projectId !== "all" && !c.projects.some((p) => String(p.id) === projectId)) return false;
      if (query) {
        const haystack = [
          c.containerNumber,
          c.ciNumbers,
          c.billOfLading,
          c.broker,
          c.freightVendor,
          c.notes,
          ...c.projects.map((p) => p.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [containers, status, projectId, q]);

  const groups = useMemo(() => groupByCiNumber(filtered), [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por # contenedor, BL, broker, proyecto…"
          className="flex-1 min-w-[220px] rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">Todos los proyectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted">
        {filtered.length} contenedor(es) en {groups.length} CI/línea(s)
      </p>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Contenedor</th>
              <th className="px-4 py-3">Commercial Invoice (CI)</th>
              <th className="px-4 py-3">Proyecto(s)</th>
              <th className="px-4 py-3">Tamaño</th>
              <th className="px-4 py-3">ETA</th>
              <th className="px-4 py-3">ETA Obra</th>
              <th className="px-4 py-3 text-right">Flete</th>
              <th className="px-4 py-3 text-right">Broker real</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              if (group.rows.length === 1) {
                const c = group.rows[0];
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-background/60">
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 font-medium">{c.containerNumber ?? "—"}</td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <div className="min-w-0">
                          <span className="line-clamp-2 block" title={c.ciNumbers ?? undefined}>
                            {c.ciNumbers ?? "—"}
                          </span>
                          {c.ciValue != null && (
                            <span className="text-xs text-muted">
                              {formatMoney(c.ciValue, c.ciCurrency ?? "USD")}
                            </span>
                          )}
                        </div>
                        {invoicesByContainer[c.id] && (
                          <a
                            href={
                              invoicesByContainer[c.id].count === 1
                                ? `/api/broker-invoices/${invoicesByContainer[c.id].firstId}`
                                : `/containers/${c.id}`
                            }
                            target={invoicesByContainer[c.id].count === 1 ? "_blank" : undefined}
                            rel={invoicesByContainer[c.id].count === 1 ? "noopener noreferrer" : undefined}
                            title={
                              invoicesByContainer[c.id].count === 1
                                ? "Ver factura del broker"
                                : `Ver ${invoicesByContainer[c.id].count} archivos`
                            }
                            className="shrink-0 inline-flex items-center gap-0.5 text-brand hover:text-brand-dark"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            {invoicesByContainer[c.id].count > 1 && (
                              <span className="text-[10px] font-medium">{invoicesByContainer[c.id].count}</span>
                            )}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="line-clamp-2">
                        {c.projects.length ? c.projects.map((p) => p.name).join(", ") : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{c.size ?? "—"}</td>
                    <td className="px-4 py-3">{formatDate(c.eta)}</td>
                    <td className="px-4 py-3">{formatDate(c.etaJobsite)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(c.freightCost)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(c.brokerRealCost)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(totalLogistics(c.freightCost, c.brokerRealCost))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/containers/${c.id}`} className="text-sm text-brand hover:text-brand-dark">
                          {canEdit ? "Editar" : "Ver"}
                        </Link>
                        {canDelete && (
                          <DeleteButton action={deleteContainer.bind(null, c.id)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }

              const first = group.rows[0];
              const isOpen = expanded.has(group.key);
              const totalCiValue = group.rows.reduce((sum, r) => sum + (r.ciValue ?? 0), 0);
              const totalFreight = group.rows.reduce((sum, r) => sum + (r.freightCost ?? 0), 0);
              const totalBroker = group.rows.reduce((sum, r) => sum + (r.brokerRealCost ?? 0), 0);
              const allProjects = Array.from(
                new Map(group.rows.flatMap((r) => r.projects).map((p) => [p.id, p])).values(),
              );

              return (
                <Fragment key={group.key}>
                  <tr className="border-b border-border bg-background/40 hover:bg-background/60 font-medium">
                    <td className="px-4 py-3">
                      <StatusBadge status={first.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(group.key)}
                        className="inline-flex items-center gap-1 text-brand hover:text-brand-dark font-medium"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        {group.rows.length} contenedores
                      </button>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="min-w-0">
                        <span className="line-clamp-2 block" title={first.ciNumbers ?? undefined}>
                          {first.ciNumbers ?? "—"}
                        </span>
                        {totalCiValue > 0 && (
                          <span className="text-xs text-muted">
                            {formatMoney(totalCiValue, first.ciCurrency ?? "USD")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="line-clamp-2">
                        {allProjects.length ? allProjects.map((p) => p.name).join(", ") : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted font-normal">Ver detalle</td>
                    <td className="px-4 py-3 text-muted font-normal">Ver detalle</td>
                    <td className="px-4 py-3 text-muted font-normal">Ver detalle</td>
                    <td className="px-4 py-3 text-right">{formatMoney(totalFreight || null)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(totalBroker || null)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(totalLogistics(totalFreight, totalBroker))}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                  {isOpen &&
                    group.rows.map((c) => (
                      <tr key={c.id} className="border-b border-border bg-background/15 text-muted">
                        <td className="px-4 py-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="pl-6 inline-flex items-center gap-1 font-medium text-foreground">
                            <span className="text-border">↳</span>
                            {c.containerNumber ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {invoicesByContainer[c.id] && (
                            <a
                              href={
                                invoicesByContainer[c.id].count === 1
                                  ? `/api/broker-invoices/${invoicesByContainer[c.id].firstId}`
                                  : `/containers/${c.id}`
                              }
                              target={invoicesByContainer[c.id].count === 1 ? "_blank" : undefined}
                              rel={invoicesByContainer[c.id].count === 1 ? "noopener noreferrer" : undefined}
                              title={
                                invoicesByContainer[c.id].count === 1
                                  ? "Ver factura del broker"
                                  : `Ver ${invoicesByContainer[c.id].count} archivos`
                              }
                              className="inline-flex items-center gap-0.5 text-brand hover:text-brand-dark"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              {invoicesByContainer[c.id].count > 1 && (
                                <span className="text-[10px] font-medium">{invoicesByContainer[c.id].count}</span>
                              )}
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <span className="line-clamp-2">
                            {c.projects.length ? c.projects.map((p) => p.name).join(", ") : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{c.size ?? "—"}</td>
                        <td className="px-4 py-3">{formatDate(c.eta)}</td>
                        <td className="px-4 py-3">{formatDate(c.etaJobsite)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(c.freightCost)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(c.brokerRealCost)}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatMoney(totalLogistics(c.freightCost, c.brokerRealCost))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/containers/${c.id}`}
                              className="text-sm text-brand hover:text-brand-dark"
                            >
                              {canEdit ? "Editar" : "Ver"}
                            </Link>
                            {canDelete && <DeleteButton action={deleteContainer.bind(null, c.id)} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
            {groups.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted">
                  No hay contenedores que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
