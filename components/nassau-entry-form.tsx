"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { NASSAU_PAYMENT_METHODS, NASSAU_PAYMENT_STATUSES, NASSAU_SHIPPING_STATUSES } from "@/lib/nassau/constants";
import type { NassauEntryRow } from "@/lib/data/nassau";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface";

export function NassauEntryForm({
  action,
  defaultValues,
  submitLabel = "Guardar",
  readOnly = false,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: NassauEntryRow;
  submitLabel?: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form action={(formData) => startTransition(() => action(formData))} className="space-y-8">
      {readOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3">
          Solo puedes ver esta compra — tu cuenta no tiene permiso para editar Compras.
        </div>
      )}
      <fieldset disabled={readOnly} className="space-y-8 border-0 p-0 m-0 min-w-0">
        <section className="bg-surface border border-border rounded-xl p-5 space-y-4 card-shadow">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">General</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Vendedor">
              <input name="vendor" required defaultValue={defaultValues?.vendor ?? ""} className={inputClass} />
            </Field>
            <Field label="Cuenta">
              <input name="account" defaultValue={defaultValues?.account ?? ""} className={inputClass} />
            </Field>
            <Field label="P.O #">
              <input
                name="poNumber"
                required
                defaultValue={defaultValues?.poNumber ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Fecha de la P.O.">
              <input type="date" name="poDate" defaultValue={defaultValues?.poDate ?? ""} className={inputClass} />
            </Field>
            <Field label="Proyecto">
              <input name="project" defaultValue={defaultValues?.project ?? ""} className={inputClass} />
            </Field>
            <Field label="Sub proyecto">
              <input name="subProject" defaultValue={defaultValues?.subProject ?? ""} className={inputClass} />
            </Field>
          </div>
        </section>

        <section className="bg-surface border border-border rounded-xl p-5 space-y-4 card-shadow">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Facturación</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Número de factura">
              <input
                name="invoiceNumber"
                defaultValue={defaultValues?.invoiceNumber ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Monto">
              <input
                type="number"
                step="0.01"
                name="amount"
                defaultValue={defaultValues?.amount ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Estado de pago">
              <select name="paymentStatus" defaultValue={defaultValues?.paymentStatus ?? ""} className={inputClass}>
                <option value="">—</option>
                {NASSAU_PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha de vencimiento">
              <input type="date" name="dueDate" defaultValue={defaultValues?.dueDate ?? ""} className={inputClass} />
            </Field>
            <Field label="Pagado el">
              <input type="date" name="paidOn" defaultValue={defaultValues?.paidOn ?? ""} className={inputClass} />
            </Field>
            <Field label="Método de pago">
              <select name="paymentMethod" defaultValue={defaultValues?.paymentMethod ?? ""} className={inputClass}>
                <option value="">—</option>
                {NASSAU_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="bg-surface border border-border rounded-xl p-5 space-y-4 card-shadow">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Envío y logística</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Flete lead time">
              <input
                name="freightLeadTime"
                defaultValue={defaultValues?.freightLeadTime ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Costo de flete">
              <input
                type="number"
                step="0.01"
                name="freightCost"
                defaultValue={defaultValues?.freightCost ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="WR # (recibo de almacén)">
              <input name="wrNumber" defaultValue={defaultValues?.wrNumber ?? ""} className={inputClass} />
            </Field>
            <Field label="Recibido el">
              <input
                type="date"
                name="receivedOn"
                defaultValue={defaultValues?.receivedOn ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Peso (Lb)">
              <input
                type="number"
                step="0.01"
                name="weightLb"
                defaultValue={defaultValues?.weightLb ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Volumen (ft³)">
              <input
                type="number"
                step="0.01"
                name="volumeFt3"
                defaultValue={defaultValues?.volumeFt3 ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Commercial Invoice (CI) #">
              <input
                name="commercialInvoiceNumber"
                defaultValue={defaultValues?.commercialInvoiceNumber ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Estado de envío">
              <select name="shippingStatus" defaultValue={defaultValues?.shippingStatus ?? ""} className={inputClass}>
                <option value="">—</option>
                {NASSAU_SHIPPING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="bg-surface border border-border rounded-xl p-5 space-y-4 card-shadow">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Notas</h2>
          <textarea
            name="notes"
            rows={3}
            defaultValue={defaultValues?.notes ?? ""}
            className={inputClass}
          />
        </section>

        <div className="flex items-center gap-3">
          {!readOnly && (
            <button
              type="submit"
              disabled={pending}
              className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors disabled:opacity-60"
            >
              {pending ? "Guardando…" : submitLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted hover:text-foreground px-3 py-2.5"
          >
            {readOnly ? "Volver" : "Cancelar"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
