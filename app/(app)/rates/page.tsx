import { auth } from "@/lib/auth";
import { getFreightRates } from "@/lib/data/freight-rates";
import { createFreightRate, deleteFreightRate, updateFreightRate } from "@/lib/actions/freight-rates";
import { DeleteButton } from "@/components/delete-button";
import { formatMoney } from "@/lib/derive";
import { SIZE_SUGGESTIONS } from "@/lib/constants";

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface";
const smallInputClass =
  "w-full rounded-lg border border-border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand bg-surface";

export default async function RatesPage() {
  const [rates, session] = await Promise.all([getFreightRates(), auth()]);
  const isAdmin = session?.user.role === "admin";

  const byVendor = new Map<string, typeof rates>();
  for (const r of rates) {
    const list = byVendor.get(r.vendor) ?? [];
    list.push(r);
    byVendor.set(r.vendor, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Tarifas de flete</h1>
        <p className="text-sm text-muted mt-1">
          Tarifas de referencia dadas por cada naviero/agente, para consultar al presupuestar un
          contenedor nuevo.
        </p>
      </div>

      {isAdmin && (
        <form
          action={createFreightRate}
          className="bg-surface border border-border rounded-xl p-5 grid sm:grid-cols-4 gap-3"
        >
          <label className="block">
            <span className="block text-xs text-muted mb-1">Vendedor/Agente</span>
            <input name="vendor" required placeholder="Ej. Overseas" className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">Naviera</span>
            <input name="shippingLine" placeholder="Ej. MSC" className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">POL (origen)</span>
            <input name="pol" placeholder="Ej. Miami" className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">POD (destino)</span>
            <input name="pod" required placeholder="Ej. Nassau" className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">Transbordo</span>
            <input name="transshipment" placeholder="Ej. None" className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">Tránsito (días)</span>
            <input type="number" name="transitDays" className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">Días de salida</span>
            <input name="departureDays" placeholder="Ej. Lunes, Miércoles" className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">Tamaño de contenedor</span>
            <input
              name="containerSize"
              list="rate-size-suggestions"
              required
              placeholder="Ej. 40ft"
              className={inputClass}
            />
            <datalist id="rate-size-suggestions">
              {SIZE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">Precio</span>
            <div className="flex gap-2">
              <input type="number" step="0.01" name="price" className={inputClass} />
              <input
                name="currency"
                defaultValue="USD"
                className="w-20 rounded-lg border border-border px-2 py-2 text-sm text-center"
              />
            </div>
          </label>
          <label className="block sm:col-span-3">
            <span className="block text-xs text-muted mb-1">Notas</span>
            <input name="notes" placeholder="Ej. No incluye hazmat o bonded cargo" className={inputClass} />
          </label>
          <button
            type="submit"
            className="self-end bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            + Agregar tarifa
          </button>
        </form>
      )}

      {rates.length === 0 ? (
        <p className="text-sm text-muted">Todavía no se han cargado tarifas.</p>
      ) : (
        Array.from(byVendor.entries()).map(([vendor, vendorRates]) =>
          isAdmin ? (
            <div key={vendor} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{vendor}</h2>
              <div aria-hidden className="hidden">
                {vendorRates.map((r) => (
                  <form
                    key={r.id}
                    id={`rate-form-${r.id}`}
                    action={updateFreightRate.bind(null, r.id)}
                  />
                ))}
              </div>
              <div className="bg-surface border border-border rounded-xl overflow-x-auto card-shadow">
                <table className="w-full text-sm min-w-[1300px]">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                      <th className="px-3 py-3">Vendedor</th>
                      <th className="px-3 py-3">Naviera</th>
                      <th className="px-3 py-3">POL</th>
                      <th className="px-3 py-3">POD</th>
                      <th className="px-3 py-3">Transbordo</th>
                      <th className="px-3 py-3">Tránsito (días)</th>
                      <th className="px-3 py-3">Días de salida</th>
                      <th className="px-3 py-3">Tamaño</th>
                      <th className="px-3 py-3">Precio</th>
                      <th className="px-3 py-3">Moneda</th>
                      <th className="px-3 py-3">Notas</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {vendorRates.map((r) => {
                      const formId = `rate-form-${r.id}`;
                      return (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-background/60">
                          <td className="px-3 py-2">
                            <input
                              form={formId}
                              name="vendor"
                              defaultValue={r.vendor}
                              required
                              className={smallInputClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              form={formId}
                              name="shippingLine"
                              defaultValue={r.shippingLine ?? ""}
                              className={smallInputClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              form={formId}
                              name="pol"
                              defaultValue={r.pol ?? ""}
                              className={smallInputClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              form={formId}
                              name="pod"
                              defaultValue={r.pod ?? ""}
                              required
                              className={smallInputClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              form={formId}
                              name="transshipment"
                              defaultValue={r.transshipment ?? ""}
                              className={smallInputClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              form={formId}
                              type="number"
                              name="transitDays"
                              defaultValue={r.transitDays ?? ""}
                              className={smallInputClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              form={formId}
                              name="departureDays"
                              defaultValue={r.departureDays ?? ""}
                              className={smallInputClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              form={formId}
                              name="containerSize"
                              defaultValue={r.containerSize}
                              required
                              list="rate-size-suggestions"
                              className={smallInputClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              form={formId}
                              type="number"
                              step="0.01"
                              name="price"
                              defaultValue={r.price ?? ""}
                              className={smallInputClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              form={formId}
                              name="currency"
                              defaultValue={r.currency ?? "USD"}
                              className={`${smallInputClass} w-16`}
                            />
                          </td>
                          <td className="px-3 py-2 min-w-[200px]">
                            <input
                              form={formId}
                              name="notes"
                              defaultValue={r.notes ?? ""}
                              className={smallInputClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              <button
                                type="submit"
                                form={formId}
                                className="text-sm text-brand hover:text-brand-dark"
                              >
                                Guardar
                              </button>
                              <DeleteButton
                                action={deleteFreightRate.bind(null, r.id)}
                                confirmText="¿Eliminar esta tarifa?"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div key={vendor} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{vendor}</h2>
              <div className="bg-surface border border-border rounded-xl overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                      <th className="px-4 py-3">Naviera</th>
                      <th className="px-4 py-3">POL</th>
                      <th className="px-4 py-3">POD</th>
                      <th className="px-4 py-3">Transbordo</th>
                      <th className="px-4 py-3">Tránsito</th>
                      <th className="px-4 py-3">Días de salida</th>
                      <th className="px-4 py-3">Tamaño</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorRates.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-background/60">
                        <td className="px-4 py-3">{r.shippingLine ?? "—"}</td>
                        <td className="px-4 py-3">{r.pol ?? "—"}</td>
                        <td className="px-4 py-3">{r.pod ?? "—"}</td>
                        <td className="px-4 py-3">{r.transshipment ?? "—"}</td>
                        <td className="px-4 py-3">
                          {r.transitDays != null ? `${r.transitDays} día(s)` : "—"}
                        </td>
                        <td className="px-4 py-3">{r.departureDays ?? "—"}</td>
                        <td className="px-4 py-3">{r.containerSize}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {r.price != null ? formatMoney(r.price, r.currency ?? "USD") : "Por confirmar"}
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <span className="line-clamp-2 text-xs text-muted">{r.notes ?? ""}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ),
        )
      )}
    </div>
  );
}
