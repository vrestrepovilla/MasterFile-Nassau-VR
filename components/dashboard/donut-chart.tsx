"use client";

import ReactECharts from "echarts-for-react";

const PALETTE = ["#c40707", "#1f2328", "#9aa1ac", "#0ea5e9", "#f59e0b", "#a855f7", "#10b981"];

export type DonutDatum = { label: string; value: number; color?: string };

export function DonutChart({
  title,
  data,
  unitLabel = "",
  centerLabel = "total",
  emptyMessage = "No hay datos en el período seleccionado.",
  valueFormatter,
  centerValueFormatter,
}: {
  title: string;
  data: DonutDatum[];
  unitLabel?: string;
  centerLabel?: string;
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
  centerValueFormatter?: (value: number) => string;
}) {
  const nonZero = data.filter((d) => d.value > 0);
  const total = nonZero.reduce((sum, d) => sum + d.value, 0);
  const format = valueFormatter ?? ((v: number) => `${v}${unitLabel}`);
  const centerFormat = centerValueFormatter ?? ((v: number) => String(v));

  const option = {
    animation: false,
    tooltip: {
      trigger: "item",
      formatter: (params: { name: string; value: number }) => `${params.name}: ${format(params.value)}`,
      backgroundColor: "var(--color-surface)",
      borderColor: "var(--color-border)",
      textStyle: { color: "var(--color-foreground)", fontSize: 12 },
    },
    color: nonZero.map((d, i) => d.color ?? PALETTE[i % PALETTE.length]),
    series: [
      {
        type: "pie",
        radius: ["60%", "88%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: "var(--color-surface)", borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        data: nonZero.map((d) => ({ name: d.label, value: d.value })),
      },
    ],
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 card-shadow">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">{title}</h2>
      {total === 0 ? (
        <div className="h-[220px] grid place-items-center text-sm text-muted-2">{emptyMessage}</div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative w-[160px] h-[160px] shrink-0">
            <ReactECharts
              option={option}
              notMerge
              style={{ height: 160, width: 160 }}
              opts={{ renderer: "svg" }}
            />
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <p className="text-xl font-semibold">{centerFormat(total)}</p>
                <p className="text-[11px] text-muted">{centerLabel}</p>
              </div>
            </div>
          </div>
          <ul className="space-y-1.5 text-xs flex-1 min-w-0">
            {nonZero.map((d, i) => (
              <li key={d.label} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-muted truncate">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: d.color ?? PALETTE[i % PALETTE.length] }}
                  />
                  {d.label}
                </span>
                <span className="font-medium">{format(d.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
