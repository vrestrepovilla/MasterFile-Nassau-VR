import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createUser, deleteUser, resetUserPassword, updateUserRole } from "@/lib/actions/users";
import { DeleteButton } from "@/components/delete-button";
import { DEPARTMENT_LABELS } from "@/lib/constants";

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface";

const SUCCESS_MESSAGES: Record<string, string> = {
  "password-reset": "Contraseña restablecida correctamente.",
  "user-created": "Usuario creado correctamente.",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const [allUsers, session, { success }] = await Promise.all([
    db.select().from(users).orderBy(asc(users.name)),
    auth(),
    searchParams,
  ]);
  const currentUserId = Number(session?.user.id);
  const successMessage = success ? SUCCESS_MESSAGES[success] : null;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-muted mt-1">
          Administra quién puede acceder a la aplicación, con qué rol y a qué área. Un usuario
          con área "Logística" o "Compras" solo ve y puede entrar a esa sección; opcionalmente
          puedes darle acceso de solo lectura a la otra área (la ve, pero no puede editarla). Los
          administradores siempre ven y editan todo.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-4 py-3">
          {successMessage}
        </div>
      )}

      <form
        action={createUser}
        className="bg-surface border border-border rounded-xl p-5 grid sm:grid-cols-2 gap-3"
      >
        <label className="block">
          <span className="block text-sm font-medium mb-1">Nombre</span>
          <input name="name" required className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Correo</span>
          <input name="email" type="email" required className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Contraseña temporal</span>
          <input name="password" type="text" required minLength={6} className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Rol</span>
          <select name="role" defaultValue="editor" className={inputClass}>
            <option value="editor">Editor</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Área</span>
          <select name="department" defaultValue="all" className={inputClass}>
            <option value="all">{DEPARTMENT_LABELS.all}</option>
            <option value="logistica">{DEPARTMENT_LABELS.logistica}</option>
            <option value="compras">{DEPARTMENT_LABELS.compras}</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">
            Ver también (solo lectura)
          </span>
          <select name="readOnlyDepartment" defaultValue="" className={inputClass}>
            <option value="">Ninguna</option>
            <option value="logistica">{DEPARTMENT_LABELS.logistica}</option>
            <option value="compras">{DEPARTMENT_LABELS.compras}</option>
          </select>
        </label>
        <button
          type="submit"
          className="sm:col-span-2 justify-self-start bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          + Crear usuario
        </button>
      </form>

      <div className="bg-surface border border-border rounded-xl divide-y divide-border">
        {allUsers.map((u) => (
          <div key={u.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium text-sm">{u.name}</p>
                <p className="text-xs text-muted">{u.email}</p>
              </div>

              <div className="flex items-center gap-2">
                <form action={updateUserRole.bind(null, u.id)} className="flex items-center gap-2">
                  <select
                    name="role"
                    defaultValue={u.role}
                    className="rounded-lg border border-border px-2 py-1.5 text-xs"
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <select
                    name="department"
                    defaultValue={u.department}
                    title="Un administrador ve todas las áreas sin importar esta opción."
                    className="rounded-lg border border-border px-2 py-1.5 text-xs"
                  >
                    <option value="all">{DEPARTMENT_LABELS.all}</option>
                    <option value="logistica">{DEPARTMENT_LABELS.logistica}</option>
                    <option value="compras">{DEPARTMENT_LABELS.compras}</option>
                  </select>
                  <select
                    name="readOnlyDepartment"
                    defaultValue={u.readOnlyDepartment ?? ""}
                    title="Área adicional que puede ver pero no editar."
                    className="rounded-lg border border-border px-2 py-1.5 text-xs"
                  >
                    <option value="">Sin acceso de lectura extra</option>
                    <option value="logistica">Ver {DEPARTMENT_LABELS.logistica}</option>
                    <option value="compras">Ver {DEPARTMENT_LABELS.compras}</option>
                  </select>
                  <button type="submit" className="text-xs text-brand hover:text-brand-dark">
                    Guardar
                  </button>
                </form>

                {u.id !== currentUserId && (
                  <DeleteButton
                    action={deleteUser.bind(null, u.id)}
                    confirmText={`¿Eliminar a ${u.name}? Perderá acceso a la aplicación.`}
                  />
                )}
              </div>
            </div>

            <form
              action={resetUserPassword.bind(null, u.id)}
              className="flex items-center gap-2"
            >
              <input
                name="password"
                type="text"
                placeholder="Nueva contraseña"
                minLength={6}
                className="rounded-lg border border-border px-3 py-1.5 text-xs flex-1 max-w-xs"
              />
              <button type="submit" className="text-xs text-brand hover:text-brand-dark">
                Restablecer contraseña
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
