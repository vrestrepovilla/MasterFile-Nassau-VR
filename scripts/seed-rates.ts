import { config } from "dotenv";
config({ path: ".env.local" });

type RateSeed = {
  vendor: string;
  shippingLine: string | null;
  pol: string | null;
  pod: string | null;
  transshipment: string | null;
  transitDays: number | null;
  departureDays: string | null;
  containerSize: string;
  price: number | null;
  notes: string | null;
};

const OVERSEAS_NOTE = "Solo ocean freight.";
const OVERSEAS_DP_NOTE = "D/P. No incluye hazmat o bonded cargo. Solo ocean freight.";

const RATES: RateSeed[] = [
  // Overseas
  {
    vendor: "Overseas",
    shippingLine: null,
    pol: "Miami",
    pod: "Nassau",
    transshipment: null,
    transitDays: null,
    departureDays: null,
    containerSize: "40ft",
    price: 4690,
    notes: OVERSEAS_NOTE,
  },
  {
    vendor: "Overseas",
    shippingLine: null,
    pol: "Miami",
    pod: "Nassau",
    transshipment: null,
    transitDays: null,
    departureDays: null,
    containerSize: "20ft",
    price: 3483,
    notes: OVERSEAS_NOTE,
  },
  {
    vendor: "Overseas",
    shippingLine: null,
    pol: "Miami",
    pod: "Montego Bay, Jamaica",
    transshipment: null,
    transitDays: null,
    departureDays: null,
    containerSize: "20ft",
    price: 5035,
    notes: OVERSEAS_DP_NOTE,
  },
  {
    vendor: "Overseas",
    shippingLine: null,
    pol: "Miami",
    pod: "Montego Bay, Jamaica",
    transshipment: null,
    transitDays: null,
    departureDays: null,
    containerSize: "40ft",
    price: 7575,
    notes: OVERSEAS_DP_NOTE,
  },
  {
    vendor: "Overseas",
    shippingLine: null,
    pol: "Miami",
    pod: "Montego Bay, Jamaica",
    transshipment: null,
    transitDays: null,
    departureDays: null,
    containerSize: "LCL",
    price: 365,
    notes: OVERSEAS_DP_NOTE,
  },
  {
    vendor: "Overseas",
    shippingLine: null,
    pol: "Miami",
    pod: "George Town, Exuma",
    transshipment: null,
    transitDays: null,
    departureDays: null,
    containerSize: "20ft",
    price: 3970,
    notes: OVERSEAS_DP_NOTE,
  },
  {
    vendor: "Overseas",
    shippingLine: null,
    pol: "Miami",
    pod: "George Town, Exuma",
    transshipment: null,
    transitDays: null,
    departureDays: null,
    containerSize: "40ft",
    price: 5650,
    notes: OVERSEAS_DP_NOTE,
  },
  {
    vendor: "Overseas",
    shippingLine: null,
    pol: "Miami",
    pod: "George Town, Exuma",
    transshipment: null,
    transitDays: null,
    departureDays: null,
    containerSize: "LCL",
    price: 380,
    notes: OVERSEAS_DP_NOTE,
  },

  // Laser — schedule/route sheet had no price column; left blank on purpose.
  {
    vendor: "Laser",
    shippingLine: "MSC",
    pol: "USPEF-PEV",
    pod: "Nassau",
    transshipment: "None",
    transitDays: 1,
    departureDays: "Lunes, Miércoles, Viernes",
    containerSize: "20'std",
    price: null,
    notes: "Precio pendiente de confirmar.",
  },
  {
    vendor: "Laser",
    shippingLine: "MSC",
    pol: "USPEF-PEV",
    pod: "Nassau",
    transshipment: "None",
    transitDays: 1,
    departureDays: "Lunes, Miércoles, Viernes",
    containerSize: "40'HC",
    price: null,
    notes: "Precio pendiente de confirmar.",
  },
  {
    vendor: "Laser",
    shippingLine: "King Ocean",
    pol: "USPEF-PEV",
    pod: "Georgetown, Exuma",
    transshipment: "None",
    transitDays: 2,
    departureDays: "Lunes y Sábado",
    containerSize: "20'std",
    price: null,
    notes: "Precio pendiente de confirmar.",
  },
  {
    vendor: "Laser",
    shippingLine: "King Ocean",
    pol: "USPEF-PEV",
    pod: "Georgetown, Exuma",
    transshipment: "None",
    transitDays: 2,
    departureDays: "Lunes y Sábado",
    containerSize: "40'HC",
    price: null,
    notes: "Precio pendiente de confirmar.",
  },
  {
    vendor: "Laser",
    shippingLine: "Seaboard Marine",
    pol: "Miami",
    pod: "Montego Bay",
    transshipment: "Via Kingston",
    transitDays: 6,
    departureDays: "Viernes",
    containerSize: "20'std",
    price: null,
    notes: "Precio pendiente de confirmar.",
  },
  {
    vendor: "Laser",
    shippingLine: "Seaboard Marine",
    pol: "Miami",
    pod: "Montego Bay",
    transshipment: "Via Kingston",
    transitDays: 6,
    departureDays: "Viernes",
    containerSize: "40'HC",
    price: null,
    notes: "Precio pendiente de confirmar.",
  },
];

async function main() {
  const { db } = await import("../lib/db");
  const { freightRates } = await import("../lib/db/schema");

  await db.insert(freightRates).values(RATES);
  console.log(`Tarifas insertadas: ${RATES.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
