import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleAlert } from "lucide-react";
import type { AttentionItem } from "@/lib/metrics-utils";

export function RequiresAttention({
  items,
  title = "Requires Attention",
}: {
  items: AttentionItem[];
  title?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 card-shadow h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {items.length > 0 && (
          <span className="text-xs font-medium bg-danger-soft text-danger rounded-full px-2 py-0.5">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 grid place-items-center text-center py-6">
          <div>
            <p className="text-sm text-foreground font-medium">Todo en orden</p>
            <p className="text-xs text-muted-2 mt-1">No hay pendientes que requieran acción.</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-1 -mx-2 overflow-y-auto max-h-[420px]">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.actionHref ?? "#"}
                className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-background transition-colors group"
              >
                {item.priority === "high" ? (
                  <AlertTriangle className="size-4 text-danger shrink-0 mt-0.5" />
                ) : (
                  <CircleAlert className="size-4 text-warning shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs text-muted">{item.description}</p>
                </div>
                {item.actionLabel && (
                  <span className="text-xs text-muted-2 group-hover:text-brand flex items-center gap-0.5 shrink-0 mt-0.5">
                    {item.actionLabel}
                    <ArrowRight className="size-3" />
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
