"use client";

import ReactECharts from "echarts-for-react";
import { formatMoney } from "@/lib/derive";

export type BarDatum = { label: string; value: number };

export function HorizontalBarChart({
  title,
  data,
  limit = 6,
  emptyMessage = "No hay datos en el período seleccionado.",
  valueFormatter = (v: number) => formatMoney(v),
}: {
  title: string;
  data: BarDatum[];
  limit?: number;
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
}) {
  // ECharts draws category axes bottom-up, so reverse to keep the largest bar on top.
  const top = data.slice(0, limit).slice().reverse();

  const option = {
    animation: false,
    grid: { left: 8, right: 24, top: 8, bottom: 24, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: number) => valueFormatter(value),
      backgroundColor: "var(--color-surface)",
      borderColor: "var(--color-border)",
      textStyle: { color: "var(--color-foreground)", fontSize: 12 },
    },
    xAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "var(--color-border)" } },
      axisLabel: {
        color: "var(--color-muted)",
        fontSize: 12,
        formatter: (v: number) => `$${Math.round(v / 1000)}k`,
      },
    },
    yAxis: {
      type: "category",
      data: top.map((d) => d.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "var(--color-foreground)", fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        data: top.map((d) => d.value),
        barMaxWidth: 18,
        itemStyle: { color: "var(--color-brand)", borderRadius: [0, 6, 6, 0] },
      },
    ],
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 card-shadow">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">{title}</h2>
      {top.length === 0 ? (
        <div className="h-[220px] grid place-items-center text-sm text-muted-2">{emptyMessage}</div>
      ) : (
        <ReactECharts
          option={option}
          notMerge
          style={{ height: Math.max(160, top.length * 44) }}
          opts={{ renderer: "svg" }}
        />
      )}
    </div>
  );
}
