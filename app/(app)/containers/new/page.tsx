import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteArea } from "@/lib/auth-helpers";
import { getProjects } from "@/lib/data/projects";
import { createContainer } from "@/lib/actions/containers";
import { ContainerForm } from "@/components/container-form";

export default async function NewContainerPage() {
  const session = await auth();
  if (!canWriteArea(session, "logistica")) redirect("/containers");

  const projects = await getProjects();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Registrar contenedor</h1>
        <p className="text-sm text-muted mt-1">
          Completa la información disponible. Puedes editarla más adelante conforme avance.
        </p>
      </div>
      <ContainerForm action={createContainer} projects={projects} submitLabel="Registrar contenedor" />
    </div>
  );
}
