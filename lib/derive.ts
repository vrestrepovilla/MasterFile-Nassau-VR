export function brokerVariance(
  budgeted: number | null | undefined,
  real: number | null | undefined,
) {
  if (budgeted == null && real == null) return null;
  return (budgeted ?? 0) - (real ?? 0);
}

export function totalLogistics(
  freight: number | null | undefined,
  real: number | null | undefined,
) {
  return (freight ?? 0) + (real ?? 0);
}

export function daysToEta(eta: string | null | undefined): number | null {
  if (!eta) return null;
  const etaDate = new Date(`${eta}T00:00:00Z`);
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.round((etaDate.getTime() - todayUtc) / 86_400_000);
}

export function formatMoney(
  n: number | null | undefined,
  currency: string = "USD",
) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));
}
