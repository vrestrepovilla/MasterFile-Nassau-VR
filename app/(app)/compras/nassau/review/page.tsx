import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNassauEntries, getPendingNassauInvoiceMatches } from "@/lib/data/nassau";
import { syncNassauInvoiceEmailsAction } from "@/lib/actions/nassau";
import { NassauReviewQueue } from "@/components/nassau-review-queue";

export default async function NassauReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ emailSynced?: string }>;
}) {
  const [matches, entries, { emailSynced }] = await Promise.all([
    getPendingNassauInvoiceMatches(),
    getNassauEntries(),
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Facturas por revisar — Nassau</h1>
            <p className="text-sm text-muted mt-1">
              {matches.length} factura(s) recibidas por correo o subidas manualmente, pendientes de
              aprobación.
            </p>
          </div>
          <form action={syncNassauInvoiceEmailsAction}>
            <button
              type="submit"
              className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
            >
              Buscar facturas nuevas
            </button>
          </form>
        </div>
      </div>

      {emailSynced != null && (
        <div className="rounded-lg border border-border bg-background/40 px-4 py-3 text-sm">
          {Number(emailSynced) > 0
            ? `Se encontraron ${emailSynced} factura(s) nueva(s) por correo.`
            : "No hay facturas nuevas en el correo de Nassau."}
        </div>
      )}

      <NassauReviewQueue matches={matches} entries={entries} />
    </div>
  );
}
