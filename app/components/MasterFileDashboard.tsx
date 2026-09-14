"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { MasterFileEntry, MasterFileLocation } from "@/lib/types";
import MasterFileModal from "@/app/components/MasterFileModal";
import InvoiceModal from "@/app/components/InvoiceModal";
import UploadInvoiceModal from "@/app/components/UploadInvoiceModal";
import { KNOWN_PROJECTS, PAYMENT_STATUSES, SHIPPING_STATUSES, NASSAU_PAYMENT_METHODS } from "@/lib/masterFileOptions";

const BLANK = "(Vacio)";

function valueOrBlank(v: string | null | undefined) {
  const t = (v ?? "").trim();
  return t === "" ? BLANK : t;
}

function uniqueValues(entries: MasterFileEntry[], selector: (e: MasterFileEntry) => string | null): string[] {
  const set = new Set<string>();
  for (const e of entries) set.add(valueOrBlank(selector(e)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function formatDate(value: string | null) {
  if (!value) return "-";
  // Construimos la fecha en hora local (no UTC) para que no se corra un dia por la zona horaria.
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

function formatAmount(amount: number | null) {
  if (amount == null) return "-";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function statusBadgeClasses(status: string | null) {
  if (!status) return "bg-cay-black/5 text-cay-ink/50";
  const normalized = status.toLowerCase().trim();
  if (
    normalized.startsWith("not ") ||
    normalized.includes("overdue") ||
    normalized === "damaged" ||
    normalized === "cancelled"
  )
    return "bg-cay-red/10 text-cay-red";
  if (normalized.includes("paid") || normalized === "received") return "bg-emerald-100 text-emerald-700";
  return "bg-amber-100 text-amber-700";
}

type ListKey =
  | "vendor"
  | "poNumber"
  | "invoiceNumber"
  | "status"
  | "project"
  | "subProject"
  | "method"
  | "wrNumber"
  | "shipping"
  | "items";

type Filters = Record<ListKey, Set<string> | null> & {
  amountMin: string;
  amountMax: string;
  dueFrom: string;
  dueTo: string;
  paidFrom: string;
  paidTo: string;
};

const EMPTY_FILTERS: Filters = {
  vendor: null,
  poNumber: null,
  invoiceNumber: null,
  amountMin: "",
  amountMax: "",
  status: null,
  project: null,
  subProject: null,
  dueFrom: "",
  dueTo: "",
  paidFrom: "",
  paidTo: "",
  method: null,
  wrNumber: null,
  shipping: null,
  items: null,
};

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);
  return ref;
}

function Th({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3">
      <span className="inline-flex items-center gap-0.5">
        {label}
        {children}
      </span>
    </th>
  );
}

function FunnelIcon({ active }: { active: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M3 4h18l-7 8v7l-4 2v-9L3 4z" />
    </svg>
  );
}

function ListColumnFilter({
  label,
  allValues,
  selected,
  onChange,
}: {
  label: string;
  allValues: string[];
  selected: Set<string> | null;
  onChange: (s: Set<string> | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useOutsideClose(open, () => setOpen(false));
  const active = selected !== null;
  const effective = selected ?? new Set(allValues);
  const visible = allValues.filter((v) => v.toLowerCase().includes(search.toLowerCase()));
  const allVisibleChecked = visible.length > 0 && visible.every((v) => effective.has(v));

  function commit(next: Set<string>) {
    onChange(next.size >= allValues.length ? null : next);
  }

  function toggle(v: string) {
    const next = new Set(effective);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    commit(next);
  }

  function toggleAllVisible() {
    const next = new Set(effective);
    if (allVisibleChecked) visible.forEach((v) => next.delete(v));
    else visible.forEach((v) => next.add(v));
    commit(next);
  }

  return (
    <span className="relative inline-block normal-case tracking-normal" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title={`Filtrar ${label}`}
        className={`ml-1 rounded p-0.5 align-middle ${active ? "text-cay-red" : "text-cay-ink/30"} hover:bg-cay-black/10`}
      >
        <FunnelIcon active={active} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-30 mt-1 w-56 rounded-md border border-cay-black/15 bg-white p-2 text-cay-ink shadow-lg"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="mb-2 w-full rounded border border-cay-black/15 px-2 py-1 text-xs focus:border-cay-red focus:outline-none"
          />
          <label className="mb-1.5 flex items-center gap-2 border-b border-cay-black/10 pb-1.5 text-xs font-medium">
            <input type="checkbox" checked={allVisibleChecked} onChange={toggleAllVisible} />
            Seleccionar todo
          </label>
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {visible.map((v) => (
              <label key={v} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={effective.has(v)} onChange={() => toggle(v)} />
                <span className="truncate">{v}</span>
              </label>
            ))}
            {visible.length === 0 && <p className="py-1 text-xs text-cay-ink/40">Sin resultados</p>}
          </div>
          {active && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setSearch("");
              }}
              className="mt-2 text-xs font-medium text-cay-red hover:underline"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}
    </span>
  );
}

function RangeColumnFilter({
  label,
  type,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  type: "number" | "date";
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const active = minValue !== "" || maxValue !== "";

  return (
    <span className="relative inline-block normal-case tracking-normal" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title={`Filtrar ${label}`}
        className={`ml-1 rounded p-0.5 align-middle ${active ? "text-cay-red" : "text-cay-ink/30"} hover:bg-cay-black/10`}
      >
        <FunnelIcon active={active} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-30 mt-1 w-48 rounded-md border border-cay-black/15 bg-white p-2 text-cay-ink shadow-lg"
        >
          <label className="mb-1 block text-[10px] font-medium uppercase text-cay-ink/50">Desde</label>
          <input
            type={type}
            value={minValue}
            onChange={(e) => onMinChange(e.target.value)}
            className="mb-2 w-full rounded border border-cay-black/15 px-2 py-1 text-xs focus:border-cay-red focus:outline-none"
          />
          <label className="mb-1 block text-[10px] font-medium uppercase text-cay-ink/50">Hasta</label>
          <input
            type={type}
            value={maxValue}
            onChange={(e) => onMaxChange(e.target.value)}
            className="w-full rounded border border-cay-black/15 px-2 py-1 text-xs focus:border-cay-red focus:outline-none"
          />
          {active && (
            <button
              type="button"
              onClick={() => {
                onMinChange("");
                onMaxChange("");
              }}
              className="mt-2 text-xs font-medium text-cay-red hover:underline"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}
    </span>
  );
}

function EditableCell({
  value,
  displayValue,
  type = "text",
  options,
  onCommit,
}: {
  value: string;
  displayValue?: React.ReactNode;
  type?: "text" | "number" | "date";
  options?: string[];
  onCommit: (newValue: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const listId = useId();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(value);
          setError(false);
          setEditing(true);
        }}
        className={`block w-full rounded px-1 py-0.5 text-left hover:bg-cay-black/5 ${error ? "ring-1 ring-cay-red" : ""}`}
      >
        {displayValue ?? (value || "-")}
      </button>
    );
  }

  async function commit() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onCommit(draft);
      setEditing(false);
    } catch {
      setError(true);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <span onClick={(e) => e.stopPropagation()} className="block">
      <input
        autoFocus
        type={type}
        value={draft}
        disabled={saving}
        list={options ? listId : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full rounded border border-cay-red/50 px-1 py-0.5 text-sm focus:outline-none"
      />
      {options && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </span>
  );
}

const NEW_OPTION_SENTINEL = "__new__";

function SelectCell({
  value,
  displayValue,
  options,
  onCommit,
  allowCustom = false,
}: {
  value: string;
  displayValue?: React.ReactNode;
  options: string[];
  onCommit: (newValue: string) => Promise<void>;
  /** Agrega una opcion "+ Agregar nuevo..." que deja escribir un valor que no esta en la lista. */
  allowCustom?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing || addingCustom) return;
    const el = selectRef.current;
    el?.focus();
    // Abre el desplegable nativo de una vez, sin necesitar un segundo clic (Chrome/Edge).
    (el as (HTMLSelectElement & { showPicker?: () => void }) | null)?.showPicker?.();
  }, [editing, addingCustom]);

  useEffect(() => {
    if (addingCustom) customInputRef.current?.focus();
  }, [addingCustom]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setError(false);
          setEditing(true);
        }}
        className={`block w-full rounded px-1 py-0.5 text-left hover:bg-cay-black/5 ${error ? "ring-1 ring-cay-red" : ""}`}
      >
        {displayValue ?? (value || "-")}
      </button>
    );
  }

  const allOptions = value && !options.includes(value) ? [value, ...options] : options;

  async function commitValue(newValue: string) {
    if (newValue === value) {
      setEditing(false);
      setAddingCustom(false);
      return;
    }
    setSaving(true);
    try {
      await onCommit(newValue);
      setEditing(false);
      setAddingCustom(false);
    } catch {
      setError(true);
      setEditing(false);
      setAddingCustom(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newValue = e.target.value;
    if (newValue === NEW_OPTION_SENTINEL) {
      setCustomDraft("");
      setAddingCustom(true);
      return;
    }
    await commitValue(newValue);
  }

  if (addingCustom) {
    return (
      <span onClick={(e) => e.stopPropagation()} className="block">
        <input
          ref={customInputRef}
          type="text"
          value={customDraft}
          disabled={saving}
          placeholder="Nuevo valor..."
          onChange={(e) => setCustomDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (customDraft.trim()) commitValue(customDraft.trim());
            }
            if (e.key === "Escape") {
              setAddingCustom(false);
              setEditing(false);
            }
          }}
          onBlur={() => {
            if (customDraft.trim()) commitValue(customDraft.trim());
            else {
              setAddingCustom(false);
              setEditing(false);
            }
          }}
          className="w-full rounded border border-cay-red/50 px-1 py-0.5 text-sm focus:outline-none"
        />
      </span>
    );
  }

  return (
    <span onClick={(e) => e.stopPropagation()} className="block">
      <select
        ref={selectRef}
        value={value}
        disabled={saving}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        className="w-full rounded border border-cay-red/50 bg-white px-1 py-0.5 text-sm focus:outline-none"
      >
        <option value="">-</option>
        {allOptions.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {allowCustom && <option value={NEW_OPTION_SENTINEL}>+ Agregar nuevo...</option>}
      </select>
    </span>
  );
}

function ItemsModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: MasterFileEntry;
  onClose: () => void;
  onSaved: (notes: string) => void;
}) {
  const [text, setText] = useState(entry.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/master-file/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      onSaved(text);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="brand-heading text-lg text-cay-black">Items comprados</h2>
        <p className="mt-1 text-xs text-cay-ink/50">
          {entry.vendor} &middot; {entry.poNumber}
        </p>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Describe los items comprados en esta PO..."
          className="mt-4 w-full rounded-md border border-cay-black/20 px-3 py-2 text-sm focus:border-cay-red focus:outline-none"
        />
        {error && <p className="mt-2 text-sm text-cay-red">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-cay-ink/70 hover:bg-cay-black/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-cay-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MasterFileDashboard({
  initialEntries,
  location,
  title = "Master File",
}: {
  initialEntries: MasterFileEntry[];
  location: MasterFileLocation;
  title?: string;
}) {
  const [entries, setEntries] = useState<MasterFileEntry[]>(initialEntries);
  const [activeEntry, setActiveEntry] = useState<MasterFileEntry | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [viewingItems, setViewingItems] = useState<MasterFileEntry | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<MasterFileEntry | null>(null);
  const [uploadingInvoiceFor, setUploadingInvoiceFor] = useState<MasterFileEntry | null>(null);
  const isNassau = location === "nassau";

  function setListFilter(key: ListKey, value: Set<string> | null) {
    setFilters((f) => ({ ...f, [key]: value }));
  }
  function setRangeFilter<K extends "amountMin" | "amountMax" | "dueFrom" | "dueTo" | "paidFrom" | "paidTo">(
    key: K,
    value: string
  ) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  // Valores presentes en los datos, para poblar los checklists de filtro.
  const vendorValues = useMemo(() => uniqueValues(entries, (e) => e.vendor), [entries]);
  const poNumberValues = useMemo(() => uniqueValues(entries, (e) => e.poNumber), [entries]);
  const invoiceNumberValues = useMemo(() => uniqueValues(entries, (e) => e.invoiceNumber), [entries]);
  const statusValues = useMemo(() => uniqueValues(entries, (e) => e.paymentStatus), [entries]);
  const projectValues = useMemo(() => uniqueValues(entries, (e) => e.project), [entries]);
  const subProjectValues = useMemo(() => uniqueValues(entries, (e) => e.subProject), [entries]);
  const methodValues = useMemo(() => uniqueValues(entries, (e) => e.paymentMethod), [entries]);
  const wrNumberValues = useMemo(() => uniqueValues(entries, (e) => e.wrNumber), [entries]);
  const shippingValues = useMemo(() => uniqueValues(entries, (e) => e.shippingStatus), [entries]);
  const itemsValues = useMemo(() => uniqueValues(entries, (e) => e.notes), [entries]);

  // Opciones sugeridas al editar (mezclan valores conocidos con lo que ya hay en los datos).
  const statusOptions = useMemo(
    () =>
      Array.from(new Set([...PAYMENT_STATUSES, ...entries.map((e) => e.paymentStatus).filter((v): v is string => !!v)])),
    [entries]
  );
  const projectOptions = useMemo(
    () =>
      Array.from(new Set([...KNOWN_PROJECTS, ...entries.map((e) => e.project).filter((v): v is string => !!v)])).sort(),
    [entries]
  );
  const shippingOptions = useMemo(
    () =>
      Array.from(
        new Set([...SHIPPING_STATUSES, ...entries.map((e) => e.shippingStatus).filter((v): v is string => !!v)])
      ),
    [entries]
  );
  const subProjectOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.subProject).filter((v): v is string => !!v))).sort(),
    [entries]
  );
  const methodOptions = useMemo(
    () =>
      Array.from(
        new Set([...NASSAU_PAYMENT_METHODS, ...entries.map((e) => e.paymentMethod).filter((v): v is string => !!v)])
      ).sort(),
    [entries]
  );
  const vendorOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.vendor).filter((v): v is string => !!v))).sort(),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (q) {
        const haystack = [e.vendor, e.poNumber, e.invoiceNumber, e.project]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.vendor && !filters.vendor.has(valueOrBlank(e.vendor))) return false;
      if (filters.poNumber && !filters.poNumber.has(valueOrBlank(e.poNumber))) return false;
      if (filters.invoiceNumber && !filters.invoiceNumber.has(valueOrBlank(e.invoiceNumber))) return false;
      if (filters.amountMin && (e.amount == null || e.amount < Number(filters.amountMin))) return false;
      if (filters.amountMax && (e.amount == null || e.amount > Number(filters.amountMax))) return false;
      if (filters.status && !filters.status.has(valueOrBlank(e.paymentStatus))) return false;
      if (filters.project && !filters.project.has(valueOrBlank(e.project))) return false;
      if (filters.subProject && !filters.subProject.has(valueOrBlank(e.subProject))) return false;
      if (filters.dueFrom && (!e.dueDate || e.dueDate < filters.dueFrom)) return false;
      if (filters.dueTo && (!e.dueDate || e.dueDate > filters.dueTo)) return false;
      if (filters.paidFrom && (!e.paidOn || e.paidOn < filters.paidFrom)) return false;
      if (filters.paidTo && (!e.paidOn || e.paidOn > filters.paidTo)) return false;
      if (filters.method && !filters.method.has(valueOrBlank(e.paymentMethod))) return false;
      if (filters.wrNumber && !filters.wrNumber.has(valueOrBlank(e.wrNumber))) return false;
      if (filters.shipping && !filters.shipping.has(valueOrBlank(e.shippingStatus))) return false;
      if (filters.items && !filters.items.has(valueOrBlank(e.notes))) return false;
      return true;
    });
  }, [entries, filters, search]);

  const hasActiveFilters =
    search !== "" || Object.values(filters).some((v) => (v instanceof Set ? true : v !== null && v !== ""));

  async function refresh() {
    const res = await fetch(`/api/master-file?location=${location}`, { cache: "no-store" });
    const data = await res.json();
    setEntries(data.entries);
  }

  async function syncOdoo() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/nassau/sync-odoo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo sincronizar con Odoo.");
      setSyncMessage(
        `${data.inserted} PO(s) nueva(s) importada(s) de ${data.newOrders} detectada(s) (${data.totalOrders} en total en Odoo).` +
          (data.backedUp ? " Respaldo en Drive actualizado." : " (No se pudo actualizar el respaldo en Drive.)")
      );
      await refresh();
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : "No se pudo sincronizar con Odoo.");
    } finally {
      setSyncing(false);
    }
  }

  async function backupToDrive() {
    setBackingUp(true);
    setBackupMessage(null);
    try {
      const res = await fetch("/api/nassau/master-file-backup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo respaldar el Master File en Drive.");
      setBackupMessage("Listo: se actualizo el respaldo del Master File en Drive.");
    } catch (err) {
      setBackupMessage(err instanceof Error ? err.message : "No se pudo respaldar el Master File en Drive.");
    } finally {
      setBackingUp(false);
    }
  }

  async function commitField(entry: MasterFileEntry, field: string, value: string) {
    const res = await fetch(`/api/master-file/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? data.entry : e)));
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="brand-heading text-2xl text-cay-black">{title}</h1>
          <p className="mt-1 text-sm text-cay-ink/70">
            {filteredEntries.length} de {entries.length} registro(s)
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSearch("");
                }}
                className="ml-2 text-xs font-medium text-cay-red hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar vendor, PO#, invoice#, proyecto..."
            className="w-64 rounded-md border border-cay-black/20 px-3 py-1.5 text-sm focus:border-cay-red focus:outline-none"
          />
          {location === "nassau" && (
            <button
              onClick={backupToDrive}
              disabled={backingUp}
              title="Guarda una copia de todo el Master File en Google Drive, por si acaso."
              className="rounded-md border border-cay-black/20 px-4 py-1.5 text-sm font-semibold text-cay-black transition hover:bg-cay-black/5 disabled:opacity-50"
            >
              {backingUp ? "Respaldando..." : "Respaldar en Drive"}
            </button>
          )}
          {location === "nassau" && (
            <button
              onClick={syncOdoo}
              disabled={syncing}
              className="rounded-md border border-cay-black/20 px-4 py-1.5 text-sm font-semibold text-cay-black transition hover:bg-cay-black/5 disabled:opacity-50"
            >
              {syncing ? "Sincronizando..." : "Sincronizar con Odoo"}
            </button>
          )}
          <button
            onClick={() => setCreatingNew(true)}
            className="rounded-md bg-cay-red px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Nueva fila
          </button>
        </div>
      </div>

      {syncMessage && (
        <p className="mb-4 rounded-md bg-cay-black/5 px-3 py-2 text-sm text-cay-ink/80">{syncMessage}</p>
      )}
      {backupMessage && (
        <p className="mb-4 rounded-md bg-cay-black/5 px-3 py-2 text-sm text-cay-ink/80">{backupMessage}</p>
      )}

      <div className="max-h-[75vh] overflow-auto rounded-lg border border-cay-black/10 bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-cay-black/10 text-xs uppercase tracking-wide text-cay-ink/50">
              <th className="w-8 px-2 py-3"></th>
              <Th label="Vendor">
                <ListColumnFilter label="Vendor" allValues={vendorValues} selected={filters.vendor} onChange={(s) => setListFilter("vendor", s)} />
              </Th>
              <Th label="P.O#">
                <ListColumnFilter label="P.O#" allValues={poNumberValues} selected={filters.poNumber} onChange={(s) => setListFilter("poNumber", s)} />
              </Th>
              <Th label="Invoice#">
                <ListColumnFilter
                  label="Invoice#"
                  allValues={invoiceNumberValues}
                  selected={filters.invoiceNumber}
                  onChange={(s) => setListFilter("invoiceNumber", s)}
                />
              </Th>
              <Th label="Amount">
                <RangeColumnFilter
                  label="Amount"
                  type="number"
                  minValue={filters.amountMin}
                  maxValue={filters.amountMax}
                  onMinChange={(v) => setRangeFilter("amountMin", v)}
                  onMaxChange={(v) => setRangeFilter("amountMax", v)}
                />
              </Th>
              <Th label="Status">
                <ListColumnFilter label="Status" allValues={statusValues} selected={filters.status} onChange={(s) => setListFilter("status", s)} />
              </Th>
              <Th label="Project">
                <ListColumnFilter label="Project" allValues={projectValues} selected={filters.project} onChange={(s) => setListFilter("project", s)} />
              </Th>
              {isNassau && (
                <Th label="Sub Project">
                  <ListColumnFilter
                    label="Sub Project"
                    allValues={subProjectValues}
                    selected={filters.subProject}
                    onChange={(s) => setListFilter("subProject", s)}
                  />
                </Th>
              )}
              <Th label="Due Date">
                <RangeColumnFilter
                  label="Due Date"
                  type="date"
                  minValue={filters.dueFrom}
                  maxValue={filters.dueTo}
                  onMinChange={(v) => setRangeFilter("dueFrom", v)}
                  onMaxChange={(v) => setRangeFilter("dueTo", v)}
                />
              </Th>
              {isNassau && (
                <Th label="Paid On">
                  <RangeColumnFilter
                    label="Paid On"
                    type="date"
                    minValue={filters.paidFrom}
                    maxValue={filters.paidTo}
                    onMinChange={(v) => setRangeFilter("paidFrom", v)}
                    onMaxChange={(v) => setRangeFilter("paidTo", v)}
                  />
                </Th>
              )}
              {isNassau && (
                <Th label="Method">
                  <ListColumnFilter label="Method" allValues={methodValues} selected={filters.method} onChange={(s) => setListFilter("method", s)} />
                </Th>
              )}
              {!isNassau && (
                <Th label="WR#">
                  <ListColumnFilter label="WR#" allValues={wrNumberValues} selected={filters.wrNumber} onChange={(s) => setListFilter("wrNumber", s)} />
                </Th>
              )}
              {!isNassau && (
                <Th label="Shipping">
                  <ListColumnFilter
                    label="Shipping"
                    allValues={shippingValues}
                    selected={filters.shipping}
                    onChange={(s) => setListFilter("shipping", s)}
                  />
                </Th>
              )}
              {isNassau && (
                <Th label="Items">
                  <ListColumnFilter label="Items" allValues={itemsValues} selected={filters.items} onChange={(s) => setListFilter("items", s)} />
                </Th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id} className="border-b border-cay-black/5 last:border-0 hover:bg-cay-paper">
                <td className="px-2 py-1 text-center">
                  <button
                    type="button"
                    title="Editar todos los campos"
                    onClick={() => setActiveEntry(entry)}
                    className="rounded p-1 text-cay-ink/40 hover:bg-cay-black/5 hover:text-cay-ink"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                    </svg>
                  </button>
                </td>
                <td className="px-1 py-1 font-medium text-cay-black">
                  <SelectCell
                    value={entry.vendor}
                    options={vendorOptions}
                    allowCustom
                    onCommit={(v) => commitField(entry, "vendor", v)}
                  />
                </td>
                <td className="px-1 py-1 text-cay-ink/80">
                  <EditableCell value={entry.poNumber} onCommit={(v) => commitField(entry, "poNumber", v)} />
                </td>
                <td className="px-1 py-1 text-cay-ink/80">
                  {entry.invoiceFileName ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingInvoice(entry);
                      }}
                      title="Ver factura"
                      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-cay-black/5"
                    >
                      <span className="truncate">{entry.invoiceNumber || "-"}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="shrink-0 text-cay-ink/40"
                      >
                        <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48" />
                      </svg>
                    </button>
                  ) : isNassau ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadingInvoiceFor(entry);
                      }}
                      title="Montar Invoice para esta PO"
                      className="w-full rounded px-1 py-0.5 text-left font-medium text-cay-red hover:bg-cay-red/5"
                    >
                      Montar Invoice
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingInvoice(entry);
                      }}
                      title="Adjuntar factura"
                      className="w-full rounded px-1 py-0.5 text-left hover:bg-cay-black/5"
                    >
                      -
                    </button>
                  )}
                </td>
                <td className="px-1 py-1 text-cay-ink/80">
                  <EditableCell
                    value={entry.amount != null ? String(entry.amount) : ""}
                    displayValue={formatAmount(entry.amount)}
                    type="number"
                    onCommit={(v) => commitField(entry, "amount", v)}
                  />
                </td>
                <td className="px-1 py-1">
                  <SelectCell
                    value={entry.paymentStatus ?? ""}
                    options={statusOptions}
                    displayValue={
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses(entry.paymentStatus)}`}>
                        {entry.paymentStatus ?? "Sin estado"}
                      </span>
                    }
                    onCommit={(v) => commitField(entry, "paymentStatus", v)}
                  />
                </td>
                <td className="px-1 py-1 text-cay-ink/80">
                  <SelectCell
                    value={entry.project ?? ""}
                    options={projectOptions}
                    onCommit={(v) => commitField(entry, "project", v)}
                  />
                </td>
                {isNassau && (
                  <td className="px-1 py-1 text-cay-ink/80">
                    <SelectCell
                      value={entry.subProject ?? ""}
                      options={subProjectOptions}
                      onCommit={(v) => commitField(entry, "subProject", v)}
                    />
                  </td>
                )}
                <td className="px-1 py-1 text-cay-ink/80">
                  <EditableCell
                    value={entry.dueDate ?? ""}
                    displayValue={formatDate(entry.dueDate)}
                    type="date"
                    onCommit={(v) => commitField(entry, "dueDate", v)}
                  />
                </td>
                {isNassau && (
                  <td className="px-1 py-1 text-cay-ink/80">
                    <EditableCell
                      value={entry.paidOn ?? ""}
                      displayValue={formatDate(entry.paidOn)}
                      type="date"
                      onCommit={(v) => commitField(entry, "paidOn", v)}
                    />
                  </td>
                )}
                {isNassau && (
                  <td className="px-1 py-1 text-cay-ink/80">
                    <SelectCell
                      value={entry.paymentMethod ?? ""}
                      options={methodOptions}
                      allowCustom
                      onCommit={(v) => commitField(entry, "paymentMethod", v)}
                    />
                  </td>
                )}
                {!isNassau && (
                  <td className="px-1 py-1 text-cay-ink/80">
                    <EditableCell value={entry.wrNumber ?? ""} onCommit={(v) => commitField(entry, "wrNumber", v)} />
                  </td>
                )}
                {!isNassau && (
                  <td className="px-1 py-1">
                    <EditableCell
                      value={entry.shippingStatus ?? ""}
                      options={shippingOptions}
                      displayValue={
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses(entry.shippingStatus)}`}
                        >
                          {entry.shippingStatus ?? "Sin estado"}
                        </span>
                      }
                      onCommit={(v) => commitField(entry, "shippingStatus", v)}
                    />
                  </td>
                )}
                {isNassau && (
                  <td className="max-w-[220px] px-1 py-1 text-cay-ink/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingItems(entry);
                      }}
                      title="Ver todos los items comprados"
                      className="block w-full truncate rounded px-1 py-0.5 text-left hover:bg-cay-black/5"
                    >
                      {entry.notes || "-"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEntries.length === 0 && entries.length > 0 && (
          <p className="p-10 text-center text-cay-ink/60">Ningun registro coincide con los filtros.</p>
        )}
        {entries.length === 0 && (
          <p className="p-10 text-center text-cay-ink/60">
            {location === "us"
              ? 'Todavia no hay registros. Se crean automaticamente al cargar una PO, o con "Nueva fila".'
              : 'Todavia no hay registros. Agrega uno con "Nueva fila".'}
          </p>
        )}
      </div>

      {(activeEntry || creatingNew) && (
        <MasterFileModal
          entry={activeEntry}
          defaultLocation={location}
          vendorOptions={vendorOptions}
          onClose={() => {
            setActiveEntry(null);
            setCreatingNew(false);
          }}
          onSaved={async () => {
            await refresh();
            setActiveEntry(null);
            setCreatingNew(false);
          }}
        />
      )}

      {viewingItems && (
        <ItemsModal
          entry={viewingItems}
          onClose={() => setViewingItems(null)}
          onSaved={(notes) =>
            setEntries((prev) => prev.map((e) => (e.id === viewingItems.id ? { ...e, notes } : e)))
          }
        />
      )}

      {viewingInvoice && (
        <InvoiceModal
          entry={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onSaved={(patch) =>
            setEntries((prev) =>
              prev.map((e) => (e.id === viewingInvoice.id ? { ...e, ...patch } : e))
            )
          }
        />
      )}

      {uploadingInvoiceFor && (
        <UploadInvoiceModal
          entry={uploadingInvoiceFor}
          onClose={() => setUploadingInvoiceFor(null)}
          onApproved={refresh}
        />
      )}
    </div>
  );
}
