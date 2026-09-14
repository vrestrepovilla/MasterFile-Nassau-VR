import { Clock } from "lucide-react";
import { relativeTime, type ActivityItem } from "@/lib/metrics-utils";

export function RecentActivity({
  items,
  title = "Recent Activity",
}: {
  items: ActivityItem[];
  title?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 card-shadow">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">{title}</h2>

      {items.length === 0 ? (
        <p className="text-sm text-muted-2 py-6 text-center">Todavía no hay actividad registrada.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <div className="size-7 rounded-full bg-background border border-border grid place-items-center shrink-0 mt-0.5">
                <Clock className="size-3.5 text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{item.description}</p>
                <p className="text-xs text-muted-2">
                  {relativeTime(item.timestamp)}
                  {item.userName && ` · ${item.userName}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
