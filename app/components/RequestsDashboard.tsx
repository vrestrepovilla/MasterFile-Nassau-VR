"use client";

import { useMemo, useState } from "react";
import type { PurchaseRequest } from "@/lib/types";
import PoModal from "@/app/components/PoModal";

type Filter = "pending" | "all";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function RequestsDashboard({
  initialRequests,
}: {
  initialRequests: PurchaseRequest[];
}) {
  const [requests, setRequests] = useState<PurchaseRequest[]>(initialRequests);
  const [filter, setFilter] = useState<Filter>("pending");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleRequests = useMemo(
    () => (filter === "pending" ? requests.filter((r) => !r.purchaseOrder) : requests),
    [requests, filter]
  );

  const pendingCount = requests.filter((r) => !r.purchaseOrder).length;

  async function refreshRequests() {
    const res = await fetch("/api/requests", { cache: "no-store" });
    const data = await res.json();
    setRequests(data.requests);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al sincronizar.");
      await refreshRequests();
      setLastSynced(new Date());
      setSyncMessage(
        data.inserted > 0
          ? `${data.inserted} solicitud(es) nueva(s) encontrada(s).`
          : "No hay solicitudes nuevas."
      );
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : "Error al sincronizar.");
    } finally {
      setSyncing(false);
    }
  }

  const activeRequest = requests.find((r) => r.id === activeRequestId) ?? null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="brand-heading text-2xl text-cay-black">Solicitudes de Compra</h1>
          <p className="mt-1 text-sm text-cay-ink/70">
            {pendingCount} pendiente(s) de PO &middot; {requests.length} en total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-md border border-cay-black/10 bg-white text-sm">
            <button
              className={`px-3 py-1.5 ${
                filter === "pending" ? "bg-cay-black text-white" : "text-cay-ink"
              }`}
              onClick={() => setFilter("pending")}
            >
              Pendientes
            </button>
            <button
              className={`px-3 py-1.5 ${filter === "all" ? "bg-cay-black text-white" : "text-cay-ink"}`}
              onClick={() => setFilter("all")}
            >
              Todas
            </button>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-md bg-cay-red px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {syncing ? "Sincronizando..." : "Sincronizar correo"}
          </button>
        </div>
      </div>

      {syncMessage && (
        <p className="mb-4 text-sm text-cay-ink/70">
          {syncMessage}
          {lastSynced && ` (ultima sincronizacion: ${formatDate(lastSynced.toISOString())})`}
        </p>
      )}

      {visibleRequests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-cay-black/20 bg-white p-10 text-center text-cay-ink/60">
          No hay solicitudes {filter === "pending" ? "pendientes" : "todavia"}. Da clic en
          &quot;Sincronizar correo&quot; para revisar cargocaybuilding@agentmail.to.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRequests.map((request) => {
            const isExpanded = expandedId === request.id;
            return (
              <div
                key={request.id}
                className="rounded-lg border border-cay-black/10 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-cay-black">
                        {request.subject || "(sin asunto)"}
                      </span>
                      {request.purchaseOrder ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          PO {request.purchaseOrder.poNumber}
                        </span>
                      ) : (
                        <span className="rounded-full bg-cay-red/10 px-2 py-0.5 text-xs font-medium text-cay-red">
                          Pendiente
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-cay-ink/60">
                      De {request.fromEmail} &middot; {formatDate(request.receivedAt)}
                    </p>
                    {request.bodyText && (
                      <p
                        className={`mt-2 whitespace-pre-wrap text-sm text-cay-ink/80 ${
                          isExpanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {request.bodyText}
                      </p>
                    )}
                    {request.bodyText && request.bodyText.length > 140 && (
                      <button
                        className="mt-1 text-xs font-medium text-cay-red underline-offset-2 hover:underline"
                        onClick={() => setExpandedId(isExpanded ? null : request.id)}
                      >
                        {isExpanded ? "ver menos" : "ver mas"}
                      </button>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                    <button
                      onClick={() => setActiveRequestId(request.id)}
                      className="rounded-md border border-cay-black px-3 py-1.5 text-xs font-semibold text-cay-black transition hover:bg-cay-black hover:text-white"
                    >
                      {request.purchaseOrder ? "Editar PO" : "Cargar PO"}
                    </button>
                    {request.purchaseOrder?.pdfFilename && (
                      <a
                        href={`/api/pos/${request.purchaseOrder.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cay-ink/60 underline-offset-2 hover:underline"
                      >
                        Ver PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeRequest && (
        <PoModal
          request={activeRequest}
          onClose={() => setActiveRequestId(null)}
          onSaved={async () => {
            await refreshRequests();
            setActiveRequestId(null);
          }}
        />
      )}
    </div>
  );
}
