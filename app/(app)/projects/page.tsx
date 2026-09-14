import { getProjects } from "@/lib/data/projects";
import { createProject, deleteProject, updateProject } from "@/lib/actions/projects";
import { DeleteButton } from "@/components/delete-button";

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Proyectos</h1>
        <p className="text-sm text-muted mt-1">
          Administra los proyectos disponibles para asignar a los contenedores.
        </p>
      </div>

      <form
        action={createProject}
        className="bg-surface border border-border rounded-xl p-5 grid sm:grid-cols-4 gap-3 items-end"
      >
        <label className="block sm:col-span-2">
          <span className="block text-sm font-medium mb-1">Nombre del proyecto</span>
          <input name="name" required className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Ubicación</span>
          <input name="location" className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Supervisor</span>
          <input name="supervisor" className={inputClass} />
        </label>
        <button
          type="submit"
          className="sm:col-span-4 justify-self-start bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          + Agregar proyecto
        </button>
      </form>

      <div className="bg-surface border border-border rounded-xl divide-y divide-border">
        {projects.map((p) => (
          <form
            key={p.id}
            action={updateProject.bind(null, p.id)}
            className="p-4 grid sm:grid-cols-6 gap-3 items-end"
          >
            <label className="block sm:col-span-2">
              <span className="block text-xs text-muted mb-1">Nombre</span>
              <input name="name" defaultValue={p.name} required className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs text-muted mb-1">Ubicación</span>
              <input name="location" defaultValue={p.location ?? ""} className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs text-muted mb-1">Supervisor</span>
              <input name="supervisor" defaultValue={p.supervisor ?? ""} className={inputClass} />
            </label>
            <div className="sm:col-span-6 flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={p.active}
                  className="rounded border-border text-brand focus:ring-brand"
                />
                Activo
              </label>
              <button type="submit" className="text-sm text-brand hover:text-brand-dark">
                Guardar
              </button>
              <DeleteButton
                action={deleteProject.bind(null, p.id)}
                confirmText={`¿Eliminar el proyecto "${p.name}"? Los contenedores no se eliminarán, solo perderán esta asignación.`}
              />
            </div>
          </form>
        ))}
        {projects.length === 0 && (
          <p className="p-6 text-sm text-muted">No hay proyectos todavía.</p>
        )}
      </div>
    </div>
  );
}
