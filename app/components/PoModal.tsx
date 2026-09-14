"use client";

import { useState } from "react";
import type { PurchaseRequest } from "@/lib/types";

const KNOWN_PROJECTS = [
  "Ocean Cay Residences",
  "Harbour Point Villas",
  "Coral Ridge Plaza",
  "Mangrove Bay Marina",
  "Sunset Key Hotel Reno",
  "Palmetto Logistics Hub",
];

export default function PoModal({
  request,
  onClose,
  onSaved,
}: {
  request: PurchaseRequest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [poNumber, setPoNumber] = useState(request.purchaseOrder?.poNumber ?? "");
  const [vendor, setVendor] = useState(request.purchaseOrder?.vendor ?? "");
  const [project, setProject] = useState(request.purchaseOrder?.project ?? "");
  const [subProject, setSubProject] = useState(request.purchaseOrder?.subProject ?? "");
  const [notes, setNotes] = useState(request.purchaseOrder?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData();
    form.set("poNumber", poNumber);
    form.set("vendor", vendor);
    form.set("project", project);
    form.set("subProject", subProject);
    form.set("notes", notes);
    if (file) form.set("file", file);

    try {
      const res = await fetch(`/api/requests/${request.id}/po`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar la PO.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la PO.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="brand-heading text-lg text-cay-black">Cargar PO</h2>
        <p className="mt-1 text-sm text-cay-ink/60">
          {request.subject || "(sin asunto)"} &middot; de {request.fromEmail}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-cay-ink">Numero de PO</label>
            <input
              required
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="PO-CB-2601-436"
              className="w-full rounded-md border border-cay-black/20 px-3 py-2 text-sm focus:border-cay-red focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-cay-ink">Vendor</label>
            <input
              required
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="ABC Supply Co."
              className="w-full rounded-md border border-cay-black/20 px-3 py-2 text-sm focus:border-cay-red focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-cay-ink">Project</label>
              <input
                list="known-projects"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Harbour Point Villas"
                className="w-full rounded-md border border-cay-black/20 px-3 py-2 text-sm focus:border-cay-red focus:outline-none"
              />
              <datalist id="known-projects">
                {KNOWN_PROJECTS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-cay-ink">Sub Project</label>
              <input
                value={subProject}
                onChange={(e) => setSubProject(e.target.value)}
                placeholder="Clubhouse"
                className="w-full rounded-md border border-cay-black/20 px-3 py-2 text-sm focus:border-cay-red focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-cay-ink">PDF de la PO</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            {request.purchaseOrder?.pdfFilename && !file && (
              <p className="mt-1 text-xs text-cay-ink/50">
                Ya hay un PDF cargado ({request.purchaseOrder.pdfFilename}). Sube uno nuevo para
                reemplazarlo.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-cay-ink">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-cay-black/20 px-3 py-2 text-sm focus:border-cay-red focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-cay-red">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-cay-ink/70 hover:bg-cay-black/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-cay-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
