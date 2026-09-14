"use client";

import ReactECharts from "echarts-for-react";
import { formatMoney } from "@/lib/derive";

export type SpendSeries = {
  key: string;
  name: string;
  color: string;
  filled?: boolean;
};

export function SpendAreaChart({
  title,
  data,
  series,
  emptyMessage = "Todavía no hay suficiente historial para graficar.",
}: {
  title: string;
  data: Record<string, string | number>[];
  series: SpendSeries[];
  emptyMessage?: string;
}) {
  const hasData = data.some((d) => series.some((s) => Number(d[s.key] ?? 0) > 0));

  const option = {
    animation: false,
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number) => formatMoney(value),
      backgroundColor: "var(--color-surface)",
      borderColor: "var(--color-border)",
      textStyle: { color: "var(--color-foreground)", fontSize: 12 },
    },
    legend: {
      top: 0,
      right: 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: "var(--color-muted)", fontSize: 12 },
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.label),
      axisLine: { lineStyle: { color: "var(--color-border)" } },
      axisTick: { show: false },
      axisLabel: { color: "var(--color-muted)", fontSize: 12 },
    },
    yAxis: {
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
    series: series.map((s) => ({
      name: s.name,
      type: "line",
      data: data.map((d) => Number(d[s.key] ?? 0)),
      smooth: 0.3,
      symbol: "circle",
      symbolSize: 6,
      showSymbol: false,
      lineStyle: { color: s.color, width: 2 },
      itemStyle: { color: s.color },
      areaStyle: s.filled
        ? {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${s.color}2e` },
                { offset: 1, color: `${s.color}00` },
              ],
            },
          }
        : undefined,
    })),
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 card-shadow">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">{title}</h2>
      {hasData ? (
        <ReactECharts
          option={option}
          notMerge
          style={{ height: 260 }}
          opts={{ renderer: "svg" }}
        />
      ) : (
        <div className="h-[260px] grid place-items-center text-sm text-muted-2">{emptyMessage}</div>
      )}
    </div>
  );
}
