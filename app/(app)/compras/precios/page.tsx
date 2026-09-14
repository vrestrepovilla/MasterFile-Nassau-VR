import { Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPriceEntries } from "@/lib/data/price-entries";
import { PriceEntriesTable } from "@/components/price-entries-table";

export default async function ComprasPreciosPage() {
  const [entries, session] = await Promise.all([getPriceEntries(), auth()]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Base de Precios USA</h1>
          <p className="text-sm text-muted mt-1">
            {entries.length} precios extraídos de las P.O. de 2026, por material y vendedor. Se
            actualiza sola cada vez que subes un P.O. nuevo, y puedes editar o eliminar cualquier
            fila si algún dato quedó mal capturado.
          </p>
        </div>
        <a
          href="/api/precios/export"
          className="shrink-0 inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <Download className="h-4 w-4" />
          Descargar Excel
        </a>
      </div>

      <PriceEntriesTable entries={entries} canDelete={session?.user.role === "admin"} />
    </div>
  );
}
