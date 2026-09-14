export const STATUS_OPTIONS = [
  "Preparing",
  "In Transit",
  "Arrived at Port",
  "Customs",
  "Delivered",
  "Delayed",
] as const;

export type Status = (typeof STATUS_OPTIONS)[number];

export const STATUS_COLORS: Record<string, string> = {
  Preparing: "bg-neutral-100 text-neutral-700 border-neutral-300",
  "In Transit": "bg-amber-50 text-amber-700 border-amber-200",
  "Arrived at Port": "bg-amber-50 text-amber-700 border-amber-200",
  Customs: "bg-purple-50 text-purple-700 border-purple-200",
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Delayed: "bg-red-50 text-red-700 border-red-200",
};

// Hex equivalents of STATUS_COLORS, for contexts that can't use Tailwind
// classes directly (e.g. chart fills via recharts).
export const STATUS_COLOR_HEX: Record<string, string> = {
  Preparing: "#a3a3a3",
  "In Transit": "#f59e0b",
  "Arrived at Port": "#f59e0b",
  Customs: "#a855f7",
  Delivered: "#10b981",
  Delayed: "#c40707",
};

export const SIZE_SUGGESTIONS = [
  "20ft",
  "40ft",
  "LCL",
  "Flat Rack 40 ft",
  "Open Top 40 ft",
  "Reefer 40 ft",
];

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  editor: "Editor",
};

export const DEPARTMENT_LABELS: Record<string, string> = {
  all: "Todas las áreas",
  logistica: "Logística",
  compras: "Compras",
};
