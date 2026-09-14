import Link from "next/link";
import { STATUS_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/derive";
import type { ContainerRow } from "@/lib/data/containers";

const TRACKER_STEPS = STATUS_OPTIONS.filter((s) => s !== "Delayed");

function StatusTracker({ status }: { status: string }) {
  const currentIndex = TRACKER_STEPS.indexOf(status as (typeof TRACKER_STEPS)[number]);

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {TRACKER_STEPS.map((step, i) => {
        const isCurrent = i === currentIndex;
        const isPast = currentIndex >= 0 && i < currentIndex;
        return (
          <div key={step} className="flex items-center gap-1.5 flex-1 min-w-0">
            <div
              className={`h-1.5 rounded-full flex-1 min-w-[6px] ${
                isCurrent ? "bg-brand" : isPast ? "bg-brand/40" : "bg-border"
              }`}
              title={step}
            />
          </div>
        );
      })}
    </div>
  );
}

export function UpcomingShipments({
  shipments,
}: {
  shipments: (ContainerRow & { days: number | null })[];
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 card-shadow">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">
        Upcoming Shipments
      </h2>

      {shipments.length === 0 ? (
        <p className="text-sm text-muted-2 py-6 text-center">
          No hay contenedores pendientes de llegada en el período seleccionado.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {shipments.map((c) => (
            <Link
              key={c.id}
              href={`/containers/${c.id}`}
              className="block rounded-lg border border-border p-4 hover:border-brand/40 hover:bg-background transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm truncate">{c.containerNumber ?? "Sin número"}</p>
                {c.days != null && (
                  <span
                    className={`text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap ${
                      c.days < 0 ? "bg-danger-soft text-danger" : "bg-background text-muted"
                    }`}
                  >
                    {c.days < 0 ? `${Math.abs(c.days)}d retraso` : c.days === 0 ? "Hoy" : `en ${c.days}d`}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-1 truncate">
                {c.shippingLine ?? "—"} → {c.portOfDischarge ?? "—"}
              </p>
              <p className="text-xs text-muted-2 mt-0.5 truncate">
                ETA {formatDate(c.eta)} · {c.projects.map((p) => p.name).join(", ") || "Sin proyecto"}
              </p>
              <StatusTracker status={c.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
