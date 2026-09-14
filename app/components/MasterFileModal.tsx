"use client";

import { useState } from "react";
import type { MasterFileEntry, MasterFileLocation } from "@/lib/types";
import {
  KNOWN_PROJECTS,
  PAYMENT_STATUSES,
  SHIPPING_STATUSES,
  PAYMENT_METHODS,
  NASSAU_PAYMENT_METHODS,
} from "@/lib/masterFileOptions";

type FormState = {
  vendor: string;
  account: string;
  invoiceNumber: string;
  poNumber: string;
  amount: string;
  paymentStatus: string;
  dueDate: string;
  paidOn: string;
  paymentMethod: string;
  freightLeadTime: string;
  freightCost: string;
  wrNumber: string;
  receivedOn: string;
  weightLb: string;
  volumeFt3: string;
  commercialInvoiceNumber: string;
  shippingStatus: string;
  project: string;
  subProject: string;
  notes: string;
  location: MasterFileLocation;
};

function toFormState(entry: MasterFileEntry | null, defaultLocation: MasterFileLocation): FormState {
  return {
    vendor: entry?.vendor ?? "",
    account: entry?.account ?? "",
    invoiceNumber: entry?.invoiceNumber ?? "",
    poNumber: entry?.poNumber ?? "",
    amount: entry?.amount != null ? String(entry.amount) : "",
    paymentStatus: entry?.paymentStatus ?? "",
    dueDate: entry?.dueDate ?? "",
    paidOn: entry?.paidOn ?? "",
    paymentMethod: entry?.paymentMethod ?? "",
    freightLeadTime: entry?.freightLeadTime ?? "",
    freightCost: entry?.freightCost != null ? String(entry.freightCost) : "",
    wrNumber: entry?.wrNumber ?? "",
    receivedOn: entry?.receivedOn ?? "",
    weightLb: entry?.weightLb != null ? String(entry.weightLb) : "",
    volumeFt3: entry?.volumeFt3 != null ? String(entry.volumeFt3) : "",
    commercialInvoiceNumber: entry?.commercialInvoiceNumber ?? "",
    shippingStatus: entry?.shippingStatus ?? "",
    project: entry?.project ?? "",
    subProject: entry?.subProject ?? "",
    notes: entry?.notes ?? "",
    location: entry?.location ?? defaultLocation,
  };
}

function Field({
  label,
  value,
  onChange,
  listId,
  options,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  listId?: string;
  options?: string[];
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-cay-ink/70">{label}</label>
      <input
        type={type}
        required={required}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-cay-black/20 px-3 py-1.5 text-sm focus:border-cay-red focus:outline-none"
      />
      {listId && options && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </div>
  );
}

export default function MasterFileModal({
  entry,
  defaultLocation,
  vendorOptions = [],
  onClose,
  onSaved,
}: {
  entry: MasterFileEntry | null;
  defaultLocation: MasterFileLocation;
  vendorOptions?: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(toFormState(entry, defaultLocation));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const effectiveLocation = entry?.location ?? defaultLocation;
  const isNassau = effectiveLocation === "nassau";
  const paymentMethodOptions = isNassau ? NASSAU_PAYMENT_METHODS : PAYMENT_METHODS;

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(entry ? `/api/master-file/${entry.id}` : "/api/master-file", {
        method: entry ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el registro.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el registro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="brand-heading text-lg text-cay-black">
          {entry ? "Editar registro" : "Nueva fila del Master File"}
        </h2>
        {entry?.purchaseOrderId && (
          <p className="mt-1 text-xs text-cay-ink/50">Ligado a una PO cargada desde Solicitudes.</p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Vendor"
              value={form.vendor}
              onChange={(v) => set("vendor", v)}
              listId="known-vendors"
              options={vendorOptions}
              required
            />
            <Field label="P.O#" value={form.poNumber} onChange={(v) => set("poNumber", v)} required />
          </div>

          <section>
            <h3 className="brand-heading mb-2 text-xs text-cay-red">Factura y Pago</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Account" value={form.account} onChange={(v) => set("account", v)} />
              <Field label="Invoice #" value={form.invoiceNumber} onChange={(v) => set("invoiceNumber", v)} />
              <Field label="Amount" type="number" value={form.amount} onChange={(v) => set("amount", v)} />
              <Field
                label="Status"
                value={form.paymentStatus}
                onChange={(v) => set("paymentStatus", v)}
                listId="payment-statuses"
                options={PAYMENT_STATUSES}
              />
              <Field label="Due Date" type="date" value={form.dueDate} onChange={(v) => set("dueDate", v)} />
              <Field label="Paid On" type="date" value={form.paidOn} onChange={(v) => set("paidOn", v)} />
              <Field
                label="Method"
                value={form.paymentMethod}
                onChange={(v) => set("paymentMethod", v)}
                listId="payment-methods"
                options={paymentMethodOptions}
              />
            </div>
          </section>

          {!isNassau && (
            <section>
              <h3 className="brand-heading mb-2 text-xs text-cay-red">Flete y Recepcion</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Lead time en flete"
                  value={form.freightLeadTime}
                  onChange={(v) => set("freightLeadTime", v)}
                />
                <Field label="Freight" type="number" value={form.freightCost} onChange={(v) => set("freightCost", v)} />
                <Field label="WR#" value={form.wrNumber} onChange={(v) => set("wrNumber", v)} />
                <Field label="Received On" type="date" value={form.receivedOn} onChange={(v) => set("receivedOn", v)} />
                <Field label="Weight (Lb)" type="number" value={form.weightLb} onChange={(v) => set("weightLb", v)} />
                <Field label="Volume (ft3)" type="number" value={form.volumeFt3} onChange={(v) => set("volumeFt3", v)} />
                <Field
                  label="Comm Inv #"
                  value={form.commercialInvoiceNumber}
                  onChange={(v) => set("commercialInvoiceNumber", v)}
                />
                <Field
                  label="Status"
                  value={form.shippingStatus}
                  onChange={(v) => set("shippingStatus", v)}
                  listId="shipping-statuses"
                  options={SHIPPING_STATUSES}
                />
              </div>
            </section>
          )}

          <section>
            <h3 className="brand-heading mb-2 text-xs text-cay-red">Asignacion</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Project"
                value={form.project}
                onChange={(v) => set("project", v)}
                listId="known-projects"
                options={KNOWN_PROJECTS}
              />
              <Field label="Sub Project" value={form.subProject} onChange={(v) => set("subProject", v)} />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-cay-ink/70">{isNassau ? "Items" : "Notes"}</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                className="w-full rounded-md border border-cay-black/20 px-3 py-1.5 text-sm focus:border-cay-red focus:outline-none"
              />
            </div>
          </section>

          {error && <p className="text-sm text-cay-red">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-cay-ink/70 hover:bg-cay-black/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-cay-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
