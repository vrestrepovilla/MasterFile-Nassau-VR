import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteArea } from "@/lib/auth-helpers";
import { createNassauEntry } from "@/lib/actions/nassau";
import { NassauEntryForm } from "@/components/nassau-entry-form";

export default async function NewNassauEntryPage() {
  const session = await auth();
  if (!canWriteArea(session, "compras")) redirect("/compras/nassau");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Nueva compra — Nassau</h1>
        <p className="text-sm text-muted mt-1">Registra una orden de compra o factura de Nassau.</p>
      </div>
      <NassauEntryForm action={createNassauEntry} submitLabel="Registrar compra" />
    </div>
  );
}
