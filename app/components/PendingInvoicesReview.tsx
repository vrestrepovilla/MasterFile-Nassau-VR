"use client";

import { useMemo, useState } from "react";
import type { MasterFileEntry } from "@/lib/types";
import FileViewerModal from "@/app/components/FileViewerModal";
import { PAYMENT_STATUSES, NASSAU_PAYMENT_METHODS } from "@/lib/masterFileOptions";

export type PendingMatch = {
  id: string;
  source: string;
  fromEmail: string;
  subject: string | null;
  receivedAt: string;
  attachmentFilename: string;
  attachmentContentType: string;
  extractedInvoiceNumber: string | null;
  extractedVendor: string | null;
  extractedAmount: number | null;
  suggestedEntryId: string | null;
  suggestedVendor: string | null;
  suggestedPoNumber: string | null;
  suggestedAmount: number | null;
};

function formatAmount(amount: number | null) {
  if (amount == null) return "-";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-cay-ink/50">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-md border border-cay-black/20 px-2 py-1 text-sm focus:border-cay-red focus:outline-none disabled:bg-cay-paper disabled:text-cay-ink/60"
      />
    </div>
  );
}

const NEW_OPTION_SENTINEL = "__new__";

function SelectField({
  label,
  value,
  onChange,
  options,
  allowCustom = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  /** Agrega una opcion "+ Agregar nuevo..." que deja escribir un valor que no esta en la lista. */
  allowCustom?: boolean;
}) {
  const [customMode, setCustomMode] = useState(false);

  if (customMode) {
    return (
      <div>
        <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-cay-ink/50">{label}</label>
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nuevo valor..."
            className="w-full rounded-md border border-cay-red/50 px-2 py-1 text-sm focus:outline-none"
          />
          <button
            type="button"
            title="Volver a la lista"
            onClick={() => {
              setCustomMode(false);
              onChange("");
            }}
            className="shrink-0 text-xs text-cay-ink/50 hover:text-cay-red"
          >
            &times;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-cay-ink/50">{label}</label>
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === NEW_OPTION_SENTINEL) {
            onChange("");
            setCustomMode(true);
            return;
          }
          onChange(e.target.value);
        }}
        className="w-full rounded-md border border-cay-black/20 bg-white px-2 py-1 text-sm focus:border-cay-red focus:outline-none"
      >
        <option value="">-</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {allowCustom && <option value={NEW_OPTION_SENTINEL}>+ Agregar nuevo...</option>}
      </select>
    </div>
  );
}

function PoPicker({
  entries,
  value,
  onChange,
}: {
  entries: MasterFileEntry[];
  value: string | null;
  onChange: (entryId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return entries.slice(0, 30);
    const q = search.toLowerCase();
    return entries.filter((e) => e.poNumber.toLowerCase().includes(q) || e.vendor.toLowerCase().includes(q)).slice(0, 30);
  }, [entries, search]);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por P.O# o vendor..."
        className="w-full rounded-md border border-cay-black/20 px-2 py-1 text-xs focus:border-cay-red focus:outline-none"
      />
      <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-cay-black/10">
        {filtered.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onChange(e.id)}
            className={`block w-full truncate px-2 py-1 text-left text-xs hover:bg-cay-paper ${
              e.id === value ? "bg-cay-red/10 font-medium text-cay-red" : ""
            }`}
          >
            {e.poNumber} &middot; {e.vendor}
          </button>
        ))}
        {filtered.length === 0 && <p className="px-2 py-1 text-xs text-cay-ink/40">Sin resultados</p>}
      </div>
    </div>
  );
}

export function PendingRow({
  match,
  entries,
  lockedEntry,
  onResolved,
}: {
  match: PendingMatch;
  entries: MasterFileEntry[];
  /** Cuando se sube desde el renglon de una PO especifica, ya sabemos a cual se asocia - no hay que elegir. */
  lockedEntry?: MasterFileEntry;
  onResolved: (id: string) => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">(
    lockedEntry || match.suggestedEntryId ? "existing" : "new"
  );
  const [entryId, setEntryId] = useState<string | null>(lockedEntry ? lockedEntry.id : match.suggestedEntryId);
  const [vendor, setVendor] = useState(match.extractedVendor ?? "");
  const [poNumber, setPoNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(match.extractedInvoiceNumber ?? "");
  const [amount, setAmount] = useState(match.extractedAmount != null ? String(match.extractedAmount) : "");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState(false);

  const selectedEntry = entries.find((e) => e.id === entryId);

  async function approve() {
    setError(null);
    if (mode === "existing" && !entryId) {
      setError("Selecciona la PO a la que corresponde esta factura, o cambia a \"Crear fila nueva\".");
      return;
    }
    if (mode === "new" && (!vendor.trim() || !poNumber.trim())) {
      setError("Vendor y numero de PO son obligatorios para crear la fila.");
      return;
    }
    setSaving(true);
    try {
      const common = { invoiceNumber, amount, paymentStatus, paidOn, paymentMethod };
      const body =
        mode === "new" ? { createNew: true, vendor, poNumber, ...common } : { entryId, ...common };
      const res = await fetch(`/api/nassau/invoices/pending/${match.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo aprobar.");
      onResolved(match.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aprobar.");
    } finally {
      setSaving(false);
    }
  }

  async function reject() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/nassau/invoices/pending/${match.id}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo rechazar.");
      onResolved(match.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo rechazar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-cay-black/10 bg-white p-4">
      <button
        type="button"
        onClick={() => setViewingFile(true)}
        className="text-left font-medium text-cay-red hover:underline"
      >
        {match.attachmentFilename}
      </button>
      <p className="mt-0.5 text-xs text-cay-ink/50">
        {match.source === "manual" ? "Subida manual" : `De ${match.fromEmail}`}
        {match.subject ? ` · ${match.subject}` : ""} &middot;{" "}
        {new Date(match.receivedAt).toLocaleDateString("es-CO", { dateStyle: "medium" })}
      </p>
      <p className="mt-1 text-xs text-cay-ink/50">Completa los datos de esta factura:</p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <Field
            label="Vendor"
            value={mode === "new" ? vendor : selectedEntry?.vendor ?? ""}
            onChange={mode === "new" ? setVendor : undefined}
            disabled={mode === "existing"}
          />
          <Field
            label="P.O#"
            value={mode === "new" ? poNumber : selectedEntry?.poNumber ?? ""}
            onChange={mode === "new" ? setPoNumber : undefined}
            disabled={mode === "existing"}
          />
          <Field label="Invoice#" value={invoiceNumber} onChange={setInvoiceNumber} />
          <Field label="Amount" type="number" value={amount} onChange={setAmount} />
          <SelectField label="Status" value={paymentStatus} onChange={setPaymentStatus} options={PAYMENT_STATUSES} />
          <Field label="Paid On" type="date" value={paidOn} onChange={setPaidOn} />
          <SelectField
            label="Method"
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={NASSAU_PAYMENT_METHODS}
            allowCustom
          />
        </div>

        <div className="w-full sm:w-60 sm:shrink-0">
          {lockedEntry ? (
            <div className="rounded-md border border-cay-black/10 bg-cay-paper p-3 text-xs">
              <p className="text-cay-ink/50">Se asociara a:</p>
              <p className="mt-1 font-semibold text-cay-black">{lockedEntry.vendor}</p>
              <p className="text-cay-ink/70">{lockedEntry.poNumber}</p>
            </div>
          ) : (
            <>
              <div className="mb-2 flex overflow-hidden rounded-md border border-cay-black/15 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("existing")}
                  className={`flex-1 px-2 py-1.5 font-medium ${mode === "existing" ? "bg-cay-red text-white" : "bg-white text-cay-ink/70 hover:bg-cay-paper"}`}
                >
                  PO existente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("new");
                    setEntryId(null);
                  }}
                  className={`flex-1 px-2 py-1.5 font-medium ${mode === "new" ? "bg-cay-red text-white" : "bg-white text-cay-ink/70 hover:bg-cay-paper"}`}
                >
                  Crear fila nueva
                </button>
              </div>
              {mode === "existing" ? (
                <PoPicker entries={entries} value={entryId} onChange={setEntryId} />
              ) : (
                <p className="text-xs text-cay-ink/60">
                  Completa Vendor y P.O# a la izquierda para crear una fila nueva en el Master File de Nassau.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-cay-red">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={reject}
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-medium text-cay-ink/70 hover:bg-cay-black/5 disabled:opacity-50"
        >
          Rechazar
        </button>
        <button
          type="button"
          onClick={approve}
          disabled={saving}
          className="rounded-md bg-cay-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Aprobar"}
        </button>
      </div>

      {viewingFile && (
        <FileViewerModal
          url={`/api/nassau/invoices/pending/${match.id}/file`}
          contentType={match.attachmentContentType}
          filename={match.attachmentFilename}
          onClose={() => setViewingFile(false)}
        />
      )}
    </div>
  );
}

export default function PendingInvoicesReview({
  entries,
  pending,
  onClose,
  onResolved,
}: {
  entries: MasterFileEntry[];
  pending: PendingMatch[];
  onClose: () => void;
  onResolved: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-cay-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="brand-heading text-lg text-cay-black">Facturas pendientes de revisar</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-cay-ink/60 hover:text-cay-black">
            Cerrar
          </button>
        </div>
        <p className="mt-1 text-sm text-cay-ink/60">{pending.length} factura(s) esperando aprobacion.</p>

        <div className="mt-4 space-y-4">
          {pending.map((m) => (
            <PendingRow key={m.id} match={m} entries={entries} onResolved={onResolved} />
          ))}
          {pending.length === 0 && (
            <p className="rounded-lg border border-cay-black/10 bg-white p-10 text-center text-cay-ink/60">
              No hay facturas pendientes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
