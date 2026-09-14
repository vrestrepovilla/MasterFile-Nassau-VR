import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOutstandingNassauInvoices } from "@/lib/data/nassau";
import { NassauOutstandingBoard } from "@/components/nassau-outstanding-board";

export default async function NassauOutstandingPage({
  searchParams,
}: {
  searchParams: Promise<{ reportCreated?: string; skipped?: string; reportError?: string }>;
}) {
  const [byVendor, { reportCreated, skipped, reportError }] = await Promise.all([
    getOutstandingNassauInvoices(),
    searchParams,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/compras/nassau"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Compras Nassau
        </Link>
        <h1 className="text-2xl font-semibold">Cuentas por pagar — Nassau</h1>
        <p className="text-sm text-muted mt-1">
          Facturas pendientes de los proveedores con crédito (Ace, Premier Importers, Paint
          Suppliers).
        </p>
      </div>

      {reportCreated != null && (
        <div className="rounded-lg border border-border bg-background/40 px-4 py-3 text-sm">
          Se creó el borrador en Gmail con el Excel y los PDF de cada proveedor. Revísalo en tu
          bandeja de borradores antes de enviarlo.
          {Number(skipped) > 0 && (
            <span className="block text-muted mt-1">
              {skipped} factura(s) no se pudieron incluir en el PDF (archivo no disponible o de un
              tipo no soportado).
            </span>
          )}
        </div>
      )}
      {reportError != null && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          Elige una fecha y al menos una factura antes de generar el reporte.
        </div>
      )}

      <NassauOutstandingBoard byVendor={byVendor} />
    </div>
  );
}
