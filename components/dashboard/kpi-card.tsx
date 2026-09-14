import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Sparkline } from "./sparkline";
import type { Trend } from "@/lib/metrics-utils";

function TrendBadge({ trend, goodDirection = "up" }: { trend: Trend; goodDirection?: "up" | "down" }) {
  if (trend.direction === "none" || trend.changePercent == null) {
    return <span className="text-xs text-muted-2">Sin datos del mes anterior</span>;
  }

  const isGood = trend.direction === goodDirection;
  const Icon = trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;
  const colorClass =
    trend.direction === "flat"
      ? "text-muted"
      : isGood
        ? "text-success"
        : "text-danger";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <Icon className="size-3" strokeWidth={2.5} />
      {Math.abs(trend.changePercent).toFixed(1)}%
      <span className="text-muted-2 font-normal">vs mes anterior</span>
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  trend,
  goodDirection = "up",
  sparklineValues,
  emptyNote,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: Trend;
  goodDirection?: "up" | "down";
  sparklineValues?: number[];
  emptyNote?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 card-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="text-2xl font-semibold mt-1.5 tracking-tight">{value}</p>
        </div>
        {sparklineValues && sparklineValues.length > 1 && (
          <Sparkline values={sparklineValues} />
        )}
      </div>
      <div className="mt-2 min-h-[1rem]">
        {trend ? (
          <TrendBadge trend={trend} goodDirection={goodDirection} />
        ) : hint ? (
          <p className="text-xs text-muted-2">{hint}</p>
        ) : null}
        {emptyNote && <p className="text-xs text-muted-2">{emptyNote}</p>}
      </div>
    </div>
  );
}
