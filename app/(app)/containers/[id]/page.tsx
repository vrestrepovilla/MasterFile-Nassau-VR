import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteArea } from "@/lib/auth-helpers";
import { getContainerById } from "@/lib/data/containers";
import { getProjects } from "@/lib/data/projects";
import { getBrokerInvoices } from "@/lib/data/broker-invoices";
import { updateContainer } from "@/lib/actions/containers";
import { ContainerForm } from "@/components/container-form";
import { BrokerInvoices } from "@/components/broker-invoices";

export default async function EditContainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const containerId = Number(id);
  if (!Number.isFinite(containerId)) notFound();

  const [container, projects, invoices, session] = await Promise.all([
    getContainerById(containerId),
    getProjects(),
    getBrokerInvoices(containerId),
    auth(),
  ]);
  if (!container) notFound();

  const readOnly = !canWriteArea(session, "logistica");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">
          {container.containerNumber ?? "Contenedor sin número"}
        </h1>
        <p className="text-sm text-muted mt-1">
          {readOnly ? "Detalle del contenedor" : "Edita la información del contenedor"}
        </p>
      </div>
      <ContainerForm
        action={updateContainer.bind(null, containerId)}
        projects={projects}
        defaultValues={container}
        submitLabel="Guardar cambios"
        readOnly={readOnly}
      />
      <BrokerInvoices
        containerId={containerId}
        containerCiNumbers={container.ciNumbers}
        invoices={invoices}
        readOnly={readOnly}
      />
    </div>
  );
}
