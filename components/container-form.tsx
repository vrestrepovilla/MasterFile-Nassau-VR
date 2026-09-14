"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { STATUS_OPTIONS, SIZE_SUGGESTIONS } from "@/lib/constants";
import type { ContainerRow, ProjectRow } from "@/lib/data/containers";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface";

export function ContainerForm({
  action,
  projects,
  defaultValues,
  submitLabel = "Guardar",
  readOnly = false,
}: {
  action: (formData: FormData) => Promise<void>;
  projects: ProjectRow[];
  defaultValues?: ContainerRow;
  submitLabel?: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selectedProjectIds = new Set((defaultValues?.projects ?? []).map((p) => p.id));

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
      className="space-y-8"
    >
      {readOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3">
          Solo puedes ver este contenedor — tu cuenta no tiene permiso para editar Logística.
        </div>
      )}
      <fieldset disabled={readOnly} className="space-y-8 border-0 p-0 m-0 min-w-0">
      <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
          Información general
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Estado">
            <select
              name="status"
              defaultValue={defaultValues?.status ?? "Preparing"}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Número de contenedor">
            <input
              name="containerNumber"
              defaultValue={defaultValues?.containerNumber ?? ""}
              placeholder="Ej. MSNU1285192"
              className={inputClass}
            />
          </Field>
          <Field label="Tamaño">
            <input
              name="size"
              list="size-suggestions"
              defaultValue={defaultValues?.size ?? ""}
              placeholder="Ej. 40ft"
              className={inputClass}
            />
            <datalist id="size-suggestions">
              {SIZE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
        </div>

        <div>
          <span className="block text-sm font-medium mb-2">Proyecto(s)</span>
          <div className="grid sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
            {projects.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="projectIds"
                  value={p.id}
                  defaultChecked={selectedProjectIds.has(p.id)}
                  className="rounded border-border text-brand focus:ring-brand"
                />
                {p.name}
              </label>
            ))}
            {projects.length === 0 && (
              <p className="text-sm text-muted">No hay proyectos creados todavía.</p>
            )}
          </div>
          <p className="text-xs text-muted mt-1">
            Un contenedor puede llevar carga de varios proyectos a la vez.
          </p>
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
          Factura comercial
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Número(s) de factura (CI)">
            <input
              name="ciNumbers"
              defaultValue={defaultValues?.ciNumbers ?? ""}
              placeholder="31080, 31085…"
              className={inputClass}
            />
          </Field>
          <Field label="Fecha CI">
            <input type="date" name="ciDate" defaultValue={defaultValues?.ciDate ?? ""} className={inputClass} />
          </Field>
          <Field label="Valor CI">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                name="ciValue"
                defaultValue={defaultValues?.ciValue ?? ""}
                className={inputClass}
              />
              <input
                name="ciCurrency"
                defaultValue={defaultValues?.ciCurrency ?? "USD"}
                className="w-20 rounded-lg border border-border px-2 py-2 text-sm text-center"
              />
            </div>
          </Field>
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
          Naviera y transporte
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Naviera">
            <input
              name="shippingLine"
              defaultValue={defaultValues?.shippingLine ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Bill of Lading">
            <input
              name="billOfLading"
              defaultValue={defaultValues?.billOfLading ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Puerto de descarga">
            <input
              name="portOfDischarge"
              defaultValue={defaultValues?.portOfDischarge ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="ETD">
            <input type="date" name="etd" defaultValue={defaultValues?.etd ?? ""} className={inputClass} />
          </Field>
          <Field label="ETA (puerto)">
            <input type="date" name="eta" defaultValue={defaultValues?.eta ?? ""} className={inputClass} />
          </Field>
          <Field label="ETA a obra">
            <input
              type="date"
              name="etaJobsite"
              defaultValue={defaultValues?.etaJobsite ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Retorno a puerto">
            <input
              type="date"
              name="returnToPort"
              defaultValue={defaultValues?.returnToPort ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
          Flete y broker
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Vendedor de flete">
            <input
              name="freightVendor"
              defaultValue={defaultValues?.freightVendor ?? ""}
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
          <Field label="Broker">
            <input name="broker" defaultValue={defaultValues?.broker ?? ""} className={inputClass} />
          </Field>
          <Field label="Factura del broker">
            <input
              name="brokerInvoiceNumber"
              defaultValue={defaultValues?.brokerInvoiceNumber ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Broker presupuestado">
            <input
              type="number"
              step="0.01"
              name="budgetedBroker"
              defaultValue={defaultValues?.budgetedBroker ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Broker costo real">
            <input
              type="number"
              step="0.01"
              name="brokerRealCost"
              defaultValue={defaultValues?.brokerRealCost ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Fecha de pago al broker">
            <input
              type="date"
              name="brokerPaymentDate"
              defaultValue={defaultValues?.brokerPaymentDate ?? ""}
              className={inputClass}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input
              type="checkbox"
              name="brokerPaid"
              defaultChecked={defaultValues?.brokerPaid ?? false}
              className="rounded border-border text-brand focus:ring-brand"
            />
            Broker pagado
          </label>
          <Field label="Estado de pago">
            <input
              name="paymentStatus"
              defaultValue={defaultValues?.paymentStatus ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
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
