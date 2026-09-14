"use client";

import { useTransition } from "react";
import { approveNassauInvoiceMatch, rejectNassauInvoiceMatch } from "@/lib/actions/nassau";
import { formatMoney } from "@/lib/derive";
import type { NassauEntryRow } from "@/lib/data/nassau";

type PendingMatch = {
  id: string;
  fromEmail: string;
  subject: string | null;
  receivedAt: Date;
  attachmentFileName: string;
  extractedInvoiceNumber: string | null;
  suggestedEntryId: string | null;
  suggestedVendor: string | null;
  suggestedPoNumber: string | null;
  suggestedAmount: number | null;
};

function MatchRow({
  match,
  entries,
}: {
  match: PendingMatch;
  entries: NassauEntryRow[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3 card-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a
            href={`/api/nassau/matches/${match.id}/attachment`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand hover:text-brand-dark"
          >
            {match.attachmentFileName}
          </a>
          <p className="text-xs text-muted mt-0.5">
            De {match.fromEmail} — {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(match.receivedAt)}
          </p>
          {match.subject && <p className="text-xs text-muted">{match.subject}</p>}
        </div>
        {match.extractedInvoiceNumber && (
          <span className="text-xs text-muted">
            Número detectado: <span className="font-medium text-foreground">{match.extractedInvoiceNumber}</span>
          </span>
        )}
      </div>

      {match.suggestedEntryId && (
        <p className="text-sm">
          Sugerencia: <span className="font-medium">{match.suggestedVendor}</span> — PO{" "}
          {match.suggestedPoNumber} — {formatMoney(match.suggestedAmount)}
        </p>
      )}

      <form
        action={(formData) => startTransition(() => approveNassauInvoiceMatch(match.id, formData))}
        className="flex flex-wrap items-center gap-3"
      >
        <select
          name="entryId"
          defaultValue={match.suggestedEntryId ?? ""}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface min-w-[280px]"
        >
          <option value="">Elige a qué compra vincularla…</option>
          {entries.map((e) => (
            <option key={e.id} value={e.id}>
              {e.vendor} — PO {e.poNumber} — {formatMoney(e.amount)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Aprobar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => rejectNassauInvoiceMatch(match.id))}
          className="text-sm text-red-600 hover:text-red-700 px-2 disabled:opacity-60"
        >
          Rechazar
        </button>
      </form>
    </div>
  );
}

export function NassauReviewQueue({
  matches,
  entries,
}: {
  matches: PendingMatch[];
  entries: NassauEntryRow[];
}) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-10 text-center text-muted">
        No hay facturas pendientes de revisión.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((m) => (
        <MatchRow key={m.id} match={m} entries={entries} />
      ))}
    </div>
  );
}
