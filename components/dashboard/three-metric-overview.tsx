export function ThreeMetricOverview({
  title,
  columns,
  percent,
  percentText,
  emptyText,
  danger,
}: {
  title: string;
  columns: { label: string; value: string; danger?: boolean }[];
  percent: number | null;
  percentText?: string;
  emptyText: string;
  danger?: boolean;
}) {
  const clamped = percent != null ? Math.min(Math.max(percent, 0), 100) : 0;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 card-shadow space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>

      <div className="grid grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col.label}>
            <p className="text-xs text-muted">{col.label}</p>
            <p className={`text-lg font-semibold mt-0.5 ${col.danger ? "text-danger" : ""}`}>
              {col.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <div className="h-2 rounded-full bg-background overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${danger ? "bg-danger" : "bg-ink"}`}
            style={{ width: `${clamped}%` }}
          />
        </div>
        <p className="text-xs text-muted mt-1.5">
          {percent != null ? (
            <>
              {percent.toFixed(1)}% {percentText}
              {danger && <span className="text-danger font-medium"> — sobre presupuesto</span>}
            </>
          ) : (
            emptyText
          )}
        </p>
      </div>
    </div>
  );
}
