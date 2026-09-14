import Link from "next/link";
import { formatDate, formatMoney } from "@/lib/derive";
import type { PurchaseRow } from "@/lib/data/purchases";

function daysUntil(dueDate: string): number {
  const due = new Date(`${dueDate}T00:00:00Z`);
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - todayUtc) / 86_400_000);
}

export function UpcomingPayments({ payments }: { payments: PurchaseRow[] }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 card-shadow">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">
        Upcoming Payments
      </h2>

      {payments.length === 0 ? (
        <p className="text-sm text-muted-2 py-6 text-center">
          No hay pagos pendientes con fecha de vencimiento en el período seleccionado.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {payments.map((p) => {
            const days = p.dueDate ? daysUntil(p.dueDate) : null;
            return (
              <Link
                key={p.id}
                href={`/compras/purchases/${p.id}`}
                className="block rounded-lg border border-border p-4 hover:border-brand/40 hover:bg-background transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{p.vendor ?? "Sin vendedor"}</p>
                  {days != null && (
                    <span
                      className={`text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap ${
                        days < 0 ? "bg-danger-soft text-danger" : "bg-background text-muted"
                      }`}
                    >
                      {days < 0 ? `${Math.abs(days)}d vencido` : days === 0 ? "Hoy" : `en ${days}d`}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold mt-1">{formatMoney(p.amount)}</p>
                <p className="text-xs text-muted-2 mt-0.5 truncate">
                  Vence {formatDate(p.dueDate)} · {p.project ?? "Sin proyecto"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
