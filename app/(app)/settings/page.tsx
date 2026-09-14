import Link from "next/link";
import { auth } from "@/lib/auth";
import { updateOwnPassword } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/constants";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const [session, { success }] = await Promise.all([auth(), searchParams]);
  const user = session?.user;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted mt-1">Tu cuenta y accesos.</p>
      </div>

      {success === "password-updated" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-4 py-3">
          Contraseña actualizada correctamente.
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-5 card-shadow space-y-1">
        <p className="text-sm font-medium">{user?.name}</p>
        <p className="text-sm text-muted">{user?.email}</p>
        <p className="text-xs text-muted-2">{user ? (ROLE_LABELS[user.role] ?? user.role) : ""}</p>
      </div>

      {user && (
        <div className="bg-surface border border-border rounded-xl p-5 card-shadow space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Cambiar mi contraseña
          </h2>
          <form action={updateOwnPassword} className="flex items-center gap-2">
            <input
              name="password"
              type="password"
              placeholder="Nueva contraseña"
              minLength={6}
              required
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface"
            />
            <button
              type="submit"
              className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Guardar
            </button>
          </form>
        </div>
      )}

      {user?.role === "admin" && (
        <div className="bg-surface border border-border rounded-xl p-5 card-shadow space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Administración</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/projects" className="text-brand hover:text-brand-dark">
              Gestionar proyectos
            </Link>
            <Link href="/users" className="text-brand hover:text-brand-dark">
              Gestionar usuarios
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
