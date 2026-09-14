import { STATUS_COLORS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const classes = STATUS_COLORS[status] ?? "bg-neutral-100 text-neutral-700 border-neutral-300";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${classes}`}
    >
      {status}
    </span>
  );
}
