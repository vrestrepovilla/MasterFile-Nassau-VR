import Link from "next/link";
import { auth } from "@/lib/auth";
import { canWriteArea } from "@/lib/auth-helpers";
import { getContainers } from "@/lib/data/containers";
import { getProjects } from "@/lib/data/projects";
import { getBrokerInvoiceSummaries } from "@/lib/data/broker-invoices";
import { ContainersTable } from "@/components/containers-table";

export default async function ContainersPage() {
  const [containers, projects, session, invoiceSummaries] = await Promise.all([
    getContainers(),
    getProjects(),
    auth(),
    getBrokerInvoiceSummaries(),
  ]);
  const invoicesByContainer = Object.fromEntries(
    invoiceSummaries.map(({ containerId, ...rest }) => [containerId, rest]),
  );
  const canEdit = canWriteArea(session, "logistica");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contenedores</h1>
          <p className="text-sm text-muted mt-1">{containers.length} registrados</p>
        </div>
        {canEdit && (
          <Link
            href="/containers/new"
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            + Registrar contenedor
          </Link>
        )}
      </div>

      <ContainersTable
        containers={containers}
        projects={projects}
        canDelete={session?.user.role === "admin"}
        canEdit={canEdit}
        invoicesByContainer={invoicesByContainer}
      />
    </div>
  );
}
