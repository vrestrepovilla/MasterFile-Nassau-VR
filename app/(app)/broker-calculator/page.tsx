import { auth } from "@/lib/auth";
import { getDutyRates } from "@/lib/data/duty-rates";
import { getContainers } from "@/lib/data/containers";
import { createDutyRate, deleteDutyRate } from "@/lib/actions/duty-rates";
import { BrokerCalculator } from "@/components/broker-calculator";
import { DeleteButton } from "@/components/delete-button";

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface";

export default async function BrokerCalculatorPage() {
  const [dutyRates, containers, session] = await Promise.all([
    getDutyRates(),
    getContainers(),
    auth(),
  ]);
  const isAdmin = session?.user.role === "admin";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Calculadora de Broker — Nassau</h1>
        <p className="text-sm text-muted mt-1">
          Estima el costo de Bahamas Customs, Brokerage (Shop N Ship) y cargos de puerto (MSC
          Arawak Cay) antes de que llegue la factura real.
        </p>
      </div>

      <BrokerCalculator dutyRates={dutyRates} containers={containers} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Tasas de duty por mercancía
        </h2>

        {isAdmin && (
          <form
            action={createDutyRate}
            className="bg-surface border border-border rounded-xl p-5 grid sm:grid-cols-5 gap-3 items-end"
          >
            <label className="block sm:col-span-2">
              <span className="block text-xs text-muted mb-1">Mercancía</span>
              <input name="merchandise" required className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs text-muted mb-1">Descripción técnica</span>
              <input name="technicalDescription" className={inputClass} />
            </label>
            <label className="block">
              <span className="block text-xs text-muted mb-1">Duty %</span>
              <input type="number" step="0.01" name="dutyRatePercent" required className={inputClass} />
            </label>
            <label className="block">
              <span className="block text-xs text-muted mb-1">HS Code</span>
              <input name="hsCode" className={inputClass} />
            </label>
            <label className="block sm:col-span-3">
              <span className="block text-xs text-muted mb-1">Notas</span>
              <input name="notes" className={inputClass} />
            </label>
            <button
              type="submit"
              className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              + Agregar
            </button>
          </form>
        )}

        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-4 py-3">Mercancía</th>
                <th className="px-4 py-3">Descripción técnica</th>
                <th className="px-4 py-3">HS Code</th>
                <th className="px-4 py-3 text-right">Duty</th>
                <th className="px-4 py-3">Notas</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {dutyRates.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-background/60">
                  <td className="px-4 py-3">{r.merchandise}</td>
                  <td className="px-4 py-3 text-muted">{r.technicalDescription ?? "—"}</td>
                  <td className="px-4 py-3">{r.hsCode ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.dutyRatePercent}%</td>
                  <td className="px-4 py-3 text-muted">{r.notes ?? "—"}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <DeleteButton
                        action={deleteDutyRate.bind(null, r.id)}
                        confirmText={`¿Eliminar la tasa de "${r.merchandise}"?`}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
