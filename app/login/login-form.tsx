"use client";

import Image from "next/image";
import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { error: null });

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 shadow-xl p-8 backdrop-blur">
        <div className="flex justify-center mb-6">
          <Image src="/logo-white.png" alt="Cay Building" width={170} height={23} priority />
        </div>
        <h1 className="text-xl font-semibold text-center text-white mb-1">
          Supply-Chain-App
        </h1>
        <p className="text-sm text-white/60 text-center mb-6">Inicia sesión para continuar</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1 text-white/90">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1 text-white/90">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-brand hover:bg-brand-dark text-white font-medium rounded-lg py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
