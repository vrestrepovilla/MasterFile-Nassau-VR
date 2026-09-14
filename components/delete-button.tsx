"use client";

import { useTransition } from "react";

export function DeleteButton({
  action,
  confirmText = "¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer.",
  className,
  children = "Eliminar",
}: {
  action: () => Promise<void>;
  confirmText?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(confirmText)) {
          startTransition(() => action());
        }
      }}
      className={className ?? "text-sm text-brand hover:text-brand-dark disabled:opacity-50"}
    >
      {pending ? "Eliminando…" : children}
    </button>
  );
}
