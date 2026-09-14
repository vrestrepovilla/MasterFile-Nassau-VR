"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Paperclip } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { DeleteButton } from "@/components/delete-button";
import { deletePurchase } from "@/lib/actions/purchases";
import { formatDate, formatMoney } from "@/lib/derive";
import type { PurchaseRow } from "@/lib/data/purchases";

const PAGE_SIZE = 50;

type SelectField =
  | "status"
  | "vendor"
  | "account"
  | "project"
  | "subProject"
  | "paymentMethod"
  | "freightVendor"
  | "shippingMode"
  | "ciStatus"
  | "payApp";

type TextField =
  | "invoiceNumber"
  | "poNumber"
  | "commInvoiceNumber"
  | "warehouseReceiptNumber"
  | "notes";

function distinct(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();
}

function ColumnSelectFilter({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-surface ${
        value !== "all" ? "border-brand text-brand" : "border-border text-muted"
      }`}
    >
      <option value="all">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function ColumnTextFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Filtrar…"
      className={`w-full rounded border px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-surface ${
        value ? "border-brand text-brand" : "border-border"
      }`}
    />
  );
}

function formatLeadTime(v: string | null) {
  if (!v) return "—";
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v) : v;
}

function formatNumber(v: number | null, unit: string) {
  if (v == null) return "—";
  return `${v.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}`;
}

function AttachmentLink({
  purchaseId,
  summary,
  label,
}: {
  purchaseId: number;
  summary: { count: number; firstId: number } | undefined;
  label: string;
}) {
  if (!summary) return null;
  return (
    <a
      href={
        summary.count === 1
          ? `/api/purchase-invoices/${summary.firstId}`
          : `/compras/purchases/${purchaseId}`
      }
      target={summary.count === 1 ? "_blank" : undefined}
      rel={summary.count === 1 ? "noopener noreferrer" : undefined}
      title={summary.count === 1 ? `Ver ${label}` : `Ver ${summary.count} archivos`}
      className="shrink-0 inline-flex items-center gap-0.5 text-brand hover:text-brand-dark"
    >
      <Paperclip className="h-3.5 w-3.5" />
      {summary.count > 1 && <span className="text-[10px] font-medium">{summary.count}</span>}
    </a>
  );
}

function InvoiceCell({
  p,
  invoicesByPurchase,
}: {
  p: PurchaseRow;
  invoicesByPurchase: Record<number, { count: number; firstId: number }>;
}) {
  return (
    <td className="px-4 py-3 max-w-[160px]">
      <div className="flex items-center gap-1.5">
        <span className="line-clamp-1">{p.invoiceNumber ?? "—"}</span>
        <AttachmentLink purchaseId={p.id} summary={invoicesByPurchase[p.id]} label="factura" />
      </div>
    </td>
  );
}

function PoCell({
  p,
  posByPurchase,
}: {
  p: PurchaseRow;
  posByPurchase: Record<number, { count: number; firstId: number }>;
}) {
  return (
    <td className="px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span>{p.poNumber ?? "—"}</span>
        <AttachmentLink purchaseId={p.id} summary={posByPurchase[p.id]} label="P.O." />
      </div>
    </td>
  );
}

function RowActions({
  p,
  canDelete,
  canEdit,
}: {
  p: PurchaseRow;
  canDelete: boolean;
  canEdit: boolean;
}) {
  return (
    <td className="px-4 py-3">
      <div className="flex items-center justify-end gap-3">
        <Link href={`/compras/purchases/${p.id}`} className="text-sm text-brand hover:text-brand-dark">
          {canEdit ? "Editar" : "Ver"}
        </Link>
        {canDelete && <DeleteButton action={deletePurchase.bind(null, p.id)} />}
      </div>
    </td>
  );
}

type PurchaseGroup = {
  key: string;
  poNumber: string | null;
  rows: PurchaseRow[];
};

// Rows sharing the same numeric P.O# are almost always consecutive already
// (the server sorts by P.O#), so a single linear scan is enough to group
// them — this is how one P.O. that was split across several WR# shipments
// shows up as one row with its WR lines nested underneath.
function groupByPoNumber(rows: PurchaseRow[]): PurchaseGroup[] {
  const groups: PurchaseGroup[] = [];
  let i = 0;
  while (i < rows.length) {
    const po = rows[i].poNumber;
    if (po && /^[0-9]+$/.test(po)) {
      let j = i + 1;
      while (j < rows.length && rows[j].poNumber === po) j++;
      groups.push({ key: `po-${po}-${rows[i].id}`, poNumber: po, rows: rows.slice(i, j) });
      i = j;
    } else {
      groups.push({ key: `single-${rows[i].id}`, poNumber: po, rows: [rows[i]] });
      i++;
    }
  }
  return groups;
}

export function PurchasesTable({
  purchases,
  canDelete,
  canEdit,
  invoicesByPurchase,
  posByPurchase,
}: {
  purchases: PurchaseRow[];
  canDelete: boolean;
  canEdit: boolean;
  invoicesByPurchase: Record<number, { count: number; firstId: number }>;
  posByPurchase: Record<number, { count: number; firstId: number }>;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [selectFilters, setSelectFilters] = useState<Record<SelectField, string>>({
    status: "all",
    vendor: "all",
    account: "all",
    project: "all",
    subProject: "all",
    paymentMethod: "all",
    freightVendor: "all",
    shippingMode: "all",
    ciStatus: "all",
    payApp: "all",
  });
  const [textFilters, setTextFilters] = useState<Record<TextField, string>>({
    invoiceNumber: "",
    poNumber: "",
    commInvoiceNumber: "",
    warehouseReceiptNumber: "",
    notes: "",
  });

  function setSelectFilter(field: SelectField, value: string) {
    setSelectFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }
  function setTextFilter(field: TextField, value: string) {
    setTextFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }
  function clearColumnFilters() {
    setSelectFilters({
      status: "all",
      vendor: "all",
      account: "all",
      project: "all",
      subProject: "all",
      paymentMethod: "all",
      freightVendor: "all",
      shippingMode: "all",
      ciStatus: "all",
      payApp: "all",
    });
    setTextFilters({
      invoiceNumber: "",
      poNumber: "",
      commInvoiceNumber: "",
      warehouseReceiptNumber: "",
      notes: "",
    });
    setPage(1);
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const projects = useMemo(() => distinct(purchases.map((p) => p.project)), [purchases]);
  const vendors = useMemo(() => distinct(purchases.map((p) => p.vendor)), [purchases]);
  const statuses = useMemo(() => distinct(purchases.map((p) => p.status)), [purchases]);
  const accounts = useMemo(() => distinct(purchases.map((p) => p.account)), [purchases]);
  const subProjects = useMemo(() => distinct(purchases.map((p) => p.subProject)), [purchases]);
  const paymentMethods = useMemo(
    () => distinct(purchases.map((p) => p.paymentMethod)),
    [purchases],
  );
  const freightVendors = useMemo(
    () => distinct(purchases.map((p) => p.freightVendor)),
    [purchases],
  );
  const shippingModes = useMemo(() => distinct(purchases.map((p) => p.shippingMode)), [purchases]);
  const ciStatuses = useMemo(() => distinct(purchases.map((p) => p.ciStatus)), [purchases]);
  const payApps = useMemo(() => distinct(purchases.map((p) => p.payApp)), [purchases]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return purchases.filter((p) => {
      if (selectFilters.status !== "all" && p.status !== selectFilters.status) return false;
      if (selectFilters.vendor !== "all" && p.vendor !== selectFilters.vendor) return false;
      if (selectFilters.account !== "all" && p.account !== selectFilters.account) return false;
      if (selectFilters.project !== "all" && p.project !== selectFilters.project) return false;
      if (selectFilters.subProject !== "all" && p.subProject !== selectFilters.subProject)
        return false;
      if (
        selectFilters.paymentMethod !== "all" &&
        p.paymentMethod !== selectFilters.paymentMethod
      )
        return false;
      if (
        selectFilters.freightVendor !== "all" &&
        p.freightVendor !== selectFilters.freightVendor
      )
        return false;
      if (selectFilters.shippingMode !== "all" && p.shippingMode !== selectFilters.shippingMode)
        return false;
      if (selectFilters.ciStatus !== "all" && p.ciStatus !== selectFilters.ciStatus) return false;
      if (selectFilters.payApp !== "all" && p.payApp !== selectFilters.payApp) return false;

      for (const field of Object.keys(textFilters) as TextField[]) {
        const needle = textFilters[field].trim().toLowerCase();
        if (needle && !(p[field] ?? "").toLowerCase().includes(needle)) return false;
      }

      if (query) {
        const haystack = [
          p.vendor,
          p.invoiceNumber,
          p.poNumber,
          p.project,
          p.subProject,
          p.notes,
          p.commInvoiceNumber,
          p.containerNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [purchases, q, selectFilters, textFilters]);

  const groups = useMemo(() => groupByPoNumber(filtered), [filtered]);

  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageGroups = groups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateFilter(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPage(1);
    };
  }

  const activeFilterCount =
    Object.values(selectFilters).filter((v) => v !== "all").length +
    Object.values(textFilters).filter((v) => v.trim() !== "").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => updateFilter(setQ)(e.target.value)}
          placeholder="Buscar por vendedor, factura, PO, proyecto, CI, contenedor…"
          className="flex-1 min-w-[240px] rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearColumnFilters}
            className="text-sm text-brand hover:text-brand-dark whitespace-nowrap"
          >
            Limpiar {activeFilterCount} filtro{activeFilterCount === 1 ? "" : "s"} de columna
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        Usa los filtros bajo cada título de columna para acotar por ese campo específicamente.
      </p>

      <p className="text-xs text-muted">
        {filtered.length} resultado(s) en {groups.length} P.O./línea(s)
      </p>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto card-shadow">
        <table className="w-full text-sm min-w-[2400px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Cuenta</th>
              <th className="px-4 py-3">Factura #</th>
              <th className="px-4 py-3">PO #</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Vence</th>
              <th className="px-4 py-3">Pagado el</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Lead time (est.)</th>
              <th className="px-4 py-3">Flete (vendedor)</th>
              <th className="px-4 py-3">WR #</th>
              <th className="px-4 py-3">Recibido</th>
              <th className="px-4 py-3 text-right">Peso</th>
              <th className="px-4 py-3 text-right">Volumen</th>
              <th className="px-4 py-3">CI #</th>
              <th className="px-4 py-3">Estado CI</th>
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Sub Proyecto</th>
              <th className="px-4 py-3">Notas</th>
              <th className="px-4 py-3">PayApp</th>
              <th className="px-4 py-3">Modo de envío</th>
              <th className="px-4 py-3" />
            </tr>
            <tr className="border-b border-border bg-background/30">
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={selectFilters.vendor}
                  options={vendors}
                  onChange={(v) => setSelectFilter("vendor", v)}
                  placeholder="Todos"
                />
              </th>
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={selectFilters.account}
                  options={accounts}
                  onChange={(v) => setSelectFilter("account", v)}
                  placeholder="Todas"
                />
              </th>
              <th className="px-2 py-2">
                <ColumnTextFilter
                  value={textFilters.invoiceNumber}
                  onChange={(v) => setTextFilter("invoiceNumber", v)}
                />
              </th>
              <th className="px-2 py-2">
                <ColumnTextFilter
                  value={textFilters.poNumber}
                  onChange={(v) => setTextFilter("poNumber", v)}
                />
              </th>
              <th className="px-2 py-2" />
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={selectFilters.status}
                  options={statuses}
                  onChange={(v) => setSelectFilter("status", v)}
                  placeholder="Todos"
                />
              </th>
              <th className="px-2 py-2" />
              <th className="px-2 py-2" />
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={selectFilters.paymentMethod}
                  options={paymentMethods}
                  onChange={(v) => setSelectFilter("paymentMethod", v)}
                  placeholder="Todos"
                />
              </th>
              <th className="px-2 py-2" />
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={selectFilters.freightVendor}
                  options={freightVendors}
                  onChange={(v) => setSelectFilter("freightVendor", v)}
                  placeholder="Todos"
                />
              </th>
              <th className="px-2 py-2">
                <ColumnTextFilter
                  value={textFilters.warehouseReceiptNumber}
                  onChange={(v) => setTextFilter("warehouseReceiptNumber", v)}
                />
              </th>
              <th className="px-2 py-2" />
              <th className="px-2 py-2" />
              <th className="px-2 py-2" />
              <th className="px-2 py-2">
                <ColumnTextFilter
                  value={textFilters.commInvoiceNumber}
                  onChange={(v) => setTextFilter("commInvoiceNumber", v)}
                />
              </th>
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={selectFilters.ciStatus}
                  options={ciStatuses}
                  onChange={(v) => setSelectFilter("ciStatus", v)}
                  placeholder="Todos"
                />
              </th>
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={selectFilters.project}
                  options={projects}
                  onChange={(v) => setSelectFilter("project", v)}
                  placeholder="Todos"
                />
              </th>
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={selectFilters.subProject}
                  options={subProjects}
                  onChange={(v) => setSelectFilter("subProject", v)}
                  placeholder="Todos"
                />
              </th>
              <th className="px-2 py-2">
                <ColumnTextFilter
                  value={textFilters.notes}
                  onChange={(v) => setTextFilter("notes", v)}
                />
              </th>
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={selectFilters.payApp}
                  options={payApps}
                  onChange={(v) => setSelectFilter("payApp", v)}
                  placeholder="Todos"
                />
              </th>
              <th className="px-2 py-2">
                <ColumnSelectFilter
                  value={selectFilters.shippingMode}
                  options={shippingModes}
                  onChange={(v) => setSelectFilter("shippingMode", v)}
                  placeholder="Todos"
                />
              </th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {pageGroups.map((group) => {
              if (group.rows.length === 1) {
                const p = group.rows[0];
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-background/60">
                    <td className="px-4 py-3 font-medium">{p.vendor ?? "—"}</td>
                    <td className="px-4 py-3">{p.account ?? "—"}</td>
                    <InvoiceCell p={p} invoicesByPurchase={invoicesByPurchase} />
                    <PoCell p={p} posByPurchase={posByPurchase} />
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs whitespace-nowrap">
                        {p.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(p.dueDate)}</td>
                    <td className="px-4 py-3">{formatDate(p.paidOn)}</td>
                    <td className="px-4 py-3">{p.paymentMethod ?? "—"}</td>
                    <td className="px-4 py-3">{formatLeadTime(p.leadTimeInFreight)}</td>
                    <td className="px-4 py-3">{p.freightVendor ?? "—"}</td>
                    <td className="px-4 py-3">{p.warehouseReceiptNumber ?? "—"}</td>
                    <td className="px-4 py-3">{formatDate(p.receivedOn)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(p.weightLb, "lb")}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(p.volumeFt3, "ft³")}</td>
                    <td className="px-4 py-3">{p.commInvoiceNumber ?? "—"}</td>
                    <td className="px-4 py-3">{p.ciStatus ?? "—"}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="line-clamp-2">{p.project ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="line-clamp-2">{p.subProject ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="line-clamp-2" title={p.notes ?? undefined}>
                        {p.notes ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.payApp ?? "—"}</td>
                    <td className="px-4 py-3">{p.shippingMode ?? "—"}</td>
                    <RowActions p={p} canDelete={canDelete} canEdit={canEdit} />
                  </tr>
                );
              }

              const first = group.rows[0];
              const isOpen = expanded.has(group.key);
              const totalAmount = group.rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
              const totalWeight = group.rows.reduce((sum, r) => sum + (r.weightLb ?? 0), 0);
              const totalVolume = group.rows.reduce((sum, r) => sum + (r.volumeFt3 ?? 0), 0);

              return (
                <Fragment key={group.key}>
                  <tr className="border-b border-border bg-background/40 hover:bg-background/60 font-medium">
                    <td className="px-4 py-3 font-medium">{first.vendor ?? "—"}</td>
                    <td className="px-4 py-3">{first.account ?? "—"}</td>
                    <InvoiceCell p={first} invoicesByPurchase={invoicesByPurchase} />
                    <PoCell p={first} posByPurchase={posByPurchase} />
                    <td className="px-4 py-3 text-right">{formatMoney(totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs whitespace-nowrap">
                        {first.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(first.dueDate)}</td>
                    <td className="px-4 py-3">{formatDate(first.paidOn)}</td>
                    <td className="px-4 py-3">{first.paymentMethod ?? "—"}</td>
                    <td className="px-4 py-3">{formatLeadTime(first.leadTimeInFreight)}</td>
                    <td className="px-4 py-3">{first.freightVendor ?? "—"}</td>
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
                        {group.rows.length} WR
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted font-normal">Ver detalle</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalWeight || null, "lb")}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totalVolume || null, "ft³")}</td>
                    <td className="px-4 py-3">{first.commInvoiceNumber ?? "—"}</td>
                    <td className="px-4 py-3">{first.ciStatus ?? "—"}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="line-clamp-2">{first.project ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="line-clamp-2">{first.subProject ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="line-clamp-2" title={first.notes ?? undefined}>
                        {first.notes ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{first.payApp ?? "—"}</td>
                    <td className="px-4 py-3">{first.shippingMode ?? "—"}</td>
                    <td className="px-4 py-3" />
                  </tr>
                  {isOpen &&
                    group.rows.map((p) => (
                      <tr key={p.id} className="border-b border-border bg-background/15 text-muted">
                        <td className="px-4 py-3 text-xs">
                          <span className="pl-6 inline-flex items-center gap-1">
                            <span className="text-border">↳</span>
                            WR
                          </span>
                        </td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-right">{formatMoney(p.amount)}</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3">{formatDate(p.dueDate)}</td>
                        <td className="px-4 py-3">{formatDate(p.paidOn)}</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3">{formatLeadTime(p.leadTimeInFreight)}</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3">{p.warehouseReceiptNumber ?? "—"}</td>
                        <td className="px-4 py-3">{formatDate(p.receivedOn)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(p.weightLb, "lb")}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(p.volumeFt3, "ft³")}</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 max-w-[220px]">
                          <span className="line-clamp-2" title={p.notes ?? undefined}>
                            {p.notes ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <RowActions p={p} canDelete={canDelete} canEdit={canEdit} />
                      </tr>
                    ))}
                </Fragment>
              );
            })}
            {pageGroups.length === 0 && (
              <tr>
                <td colSpan={23} className="px-4 py-10 text-center text-muted">
                  No hay compras que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-brand hover:text-brand-dark disabled:opacity-40 disabled:hover:text-brand"
          >
            ← Anterior
          </button>
          <span className="text-muted text-xs">
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="text-brand hover:text-brand-dark disabled:opacity-40 disabled:hover:text-brand"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
