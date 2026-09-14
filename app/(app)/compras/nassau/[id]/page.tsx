import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteArea } from "@/lib/auth-helpers";
import { getNassauEntryById } from "@/lib/data/nassau";
import { updateNassauEntry } from "@/lib/actions/nassau";
import { NassauEntryForm } from "@/components/nassau-entry-form";
import { NassauEntryInvoice } from "@/components/nassau-entry-invoice";

export default async function EditNassauEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [entry, session] = await Promise.all([getNassauEntryById(id), auth()]);
  if (!entry) notFound();

  const readOnly = !canWriteArea(session, "compras");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">{entry.vendor}</h1>
        <p className="text-sm text-muted mt-1">
          {readOnly ? "Detalle de la compra" : "Edita el registro de compra"} — Nassau
        </p>
      </div>
      <NassauEntryForm
        action={updateNassauEntry.bind(null, id)}
        defaultValues={entry}
        submitLabel="Guardar cambios"
        readOnly={readOnly}
      />
      <NassauEntryInvoice entry={entry} readOnly={readOnly} />
    </div>
  );
}
