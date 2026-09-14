import { config } from "dotenv";
config({ path: ".env.local" });

import type { Status } from "../lib/constants";

type ProjectSeed = { name: string; location: string | null; supervisor: string | null };

const PROJECTS: ProjectSeed[] = [
  { name: "Demolition Phase 1 - Emerald Bay", location: "Exuma, Bahamas", supervisor: "Jhonny, Jhonathan" },
  { name: "Sandals Exuma Staff Building", location: "Exuma, Bahamas", supervisor: "Jhonny, Jhonathan" },
  {
    name: "Sandals Jamaica Montegobay",
    location: "Jamaica, Montegobay",
    supervisor: "Sebastian Sanchez, Manuela Velazquez (Almacenista)",
  },
  { name: "Harbour House Lyford Cay", location: "Nassau, Bahamas", supervisor: "Ricardo Trujillo" },
  { name: "Atlantis RT", location: "Nassau, Bahamas", supervisor: "Christian Arredondo, Andres Buitrago, Giovanni, TJ" },
  { name: "Yard", location: "Nassau, Bahamas", supervisor: "Dianne Delgado" },
  { name: "Interior Balmoral - 2026", location: "Nassau, Bahamas", supervisor: "Jennifer" },
  { name: "Warwick Hotel", location: "Nassau, Bahamas", supervisor: "David Arrieta" },
  { name: "Apto 205-Lyford Cay", location: "Nassau, Bahamas", supervisor: "Daniela Guerrero" },
  { name: "Tile works Building D - Ocean Club", location: "Nassau, Bahamas", supervisor: "Davante" },
  { name: "Tile works Building A - Ocean Club", location: "Nassau, Bahamas", supervisor: "Davante" },
];

// The old Excel referred to some projects by shorthand names. Map those to the
// real project names above so container -> project links resolve correctly.
const PROJECT_ALIASES: Record<string, string> = {
  Atlantis: "Atlantis RT",
  "Tile works Building A": "Tile works Building A - Ocean Club",
};

type ContainerSeed = {
  status: Status;
  containerNumber: string | null;
  projectNames: string[];
  size: string | null;
  ciNumbers: string | null;
  ciDate: string | null;
  ciValue: number | null;
  ciCurrency: string | null;
  shippingLine: string | null;
  billOfLading: string | null;
  etd: string | null;
  portOfDischarge: string | null;
  eta: string | null;
  etaJobsite: string | null;
  freightVendor: string | null;
  freightCost: number | null;
  broker: string | null;
  brokerInvoiceNumber: string | null;
  budgetedBroker: number | null;
  brokerRealCost: number | null;
  brokerPaymentDate: string | null;
  brokerPaid: boolean;
  notes: string | null;
};

// Migrated from "Containers Tracker Master File.xlsx" (Container Tracker sheet).
// Dates were typed inconsistently in the original file (e.g. "Agu-14-2026" for
// "Aug-14-2026") and have been normalized to ISO (YYYY-MM-DD) here.
const CONTAINERS: ContainerSeed[] = [
  {
    status: "Delivered",
    containerNumber: "MSNU1285192",
    projectNames: ["Atlantis"],
    size: "20ft",
    ciNumbers: "31080, 31085, 31086, 31087, 31091, 31092, 31093, 31094",
    ciDate: "2026-08-06",
    ciValue: 54162.95,
    ciCurrency: "USD",
    shippingLine: "MSC",
    billOfLading: "MEDUADA09776",
    etd: "2026-08-14",
    portOfDischarge: "Nassau",
    eta: "2026-08-15",
    etaJobsite: "2026-08-20",
    freightVendor: "Overseas",
    freightCost: 5576.61,
    broker: "Pinders",
    brokerInvoiceNumber: "945872 - 946238",
    budgetedBroker: 11000,
    brokerRealCost: 9799.43,
    brokerPaymentDate: "2026-08-18",
    brokerPaid: true,
    notes: null,
  },
  {
    status: "Delivered",
    containerNumber: "MSNU5336934",
    projectNames: ["Atlantis"],
    size: "LCL",
    ciNumbers: "31088, 31089, 31090",
    ciDate: "2026-08-06",
    ciValue: 19976.55,
    ciCurrency: "USD",
    shippingLine: "MSC",
    billOfLading: "MEDUADB27909",
    etd: "2026-08-17",
    portOfDischarge: "Nassau",
    eta: "2026-08-18",
    etaJobsite: "2026-08-21",
    freightVendor: "Overseas",
    freightCost: 1935.41,
    broker: "Pinders",
    brokerInvoiceNumber: "945924",
    budgetedBroker: 10000,
    brokerRealCost: 8101.45,
    brokerPaymentDate: "2026-08-19",
    brokerPaid: true,
    notes: null,
  },
  {
    status: "Delivered",
    containerNumber: "MSBU2731331",
    projectNames: ["Yard", "Harbour House Lyford Cay", "Atlantis", "Tile works Building A", "Interior Balmoral - 2026"],
    size: "20ft",
    ciNumbers: "31105",
    ciDate: "2026-08-18",
    ciValue: 50854.96,
    ciCurrency: "USD",
    shippingLine: "MSC",
    billOfLading: "MEDUADB84884",
    etd: "2026-08-21",
    portOfDischarge: "Nassau",
    eta: "2026-08-22",
    etaJobsite: "2026-08-26",
    freightVendor: "Overseas",
    freightCost: 5192.82,
    broker: "Tyrone",
    brokerInvoiceNumber: null,
    budgetedBroker: 27000,
    brokerRealCost: null,
    brokerPaymentDate: null,
    brokerPaid: false,
    notes: "Este contenedor lleva carga repartida entre varios proyectos.",
  },
  {
    status: "Delivered",
    containerNumber: "MSMU8092000",
    projectNames: ["Warwick Hotel"],
    size: "LCL",
    ciNumbers: "31102",
    ciDate: "2026-08-14",
    ciValue: 1825.2,
    ciCurrency: "USD",
    shippingLine: "MSC",
    billOfLading: "MEDUADB74729",
    etd: "2026-08-19",
    portOfDischarge: "Nassau",
    eta: "2026-08-20",
    etaJobsite: "2026-08-25",
    freightVendor: "Overseas",
    freightCost: 1118,
    broker: "Tyrone",
    brokerInvoiceNumber: null,
    budgetedBroker: 2500,
    brokerRealCost: null,
    brokerPaymentDate: null,
    brokerPaid: false,
    notes: null,
  },
  {
    status: "Arrived at Port",
    containerNumber: "MSBU8336062",
    projectNames: ["Atlantis"],
    size: "40ft",
    ciNumbers: "31074, 31100, 31101, 310103, 31104, 31106, 31107, 31109, 31110",
    ciDate: "2026-08-14",
    ciValue: 33401.41,
    ciCurrency: "USD",
    shippingLine: "MSC",
    billOfLading: "MEDUAFV64960",
    etd: "2026-08-28",
    portOfDischarge: "Nassau",
    eta: "2026-08-29",
    etaJobsite: "2026-09-02",
    freightVendor: "Overseas",
    freightCost: 6301.99,
    broker: "Pinders",
    brokerInvoiceNumber: "946559",
    budgetedBroker: 8000,
    brokerRealCost: 5837.98,
    brokerPaymentDate: null,
    brokerPaid: false,
    notes: null,
  },
  {
    status: "Arrived at Port",
    containerNumber: "KOSU-492184-5",
    projectNames: ["Demolition Phase 1 - Emerald Bay"],
    size: "LCL",
    ciNumbers: "31111",
    ciDate: "2026-08-24",
    ciValue: 2237,
    ciCurrency: "USD",
    shippingLine: "King Ocean Services, LTD.",
    billOfLading: "PEVEXU07450",
    etd: "2026-08-29",
    portOfDischarge: "Exuma",
    eta: "2026-08-30",
    etaJobsite: "2026-09-02",
    freightVendor: "Laser",
    freightCost: 396.37,
    broker: "Tyrone",
    brokerInvoiceNumber: null,
    budgetedBroker: 3400,
    brokerRealCost: null,
    brokerPaymentDate: null,
    brokerPaid: false,
    notes: null,
  },
  {
    status: "Preparing",
    containerNumber: "MSNU9645675",
    projectNames: ["Yard"],
    size: "LCL",
    ciNumbers: "31112",
    ciDate: "2026-08-25",
    ciValue: 21540.31,
    ciCurrency: "USD",
    shippingLine: "MSC",
    billOfLading: "MEDUAFU43868",
    etd: "2026-08-31",
    portOfDischarge: "Nassau",
    eta: "2026-09-01",
    etaJobsite: "2026-09-04",
    freightVendor: "Laser",
    freightCost: 2105.76,
    broker: "Tyrone",
    brokerInvoiceNumber: null,
    budgetedBroker: 13000,
    brokerRealCost: null,
    brokerPaymentDate: null,
    brokerPaid: false,
    notes: null,
  },
  {
    status: "Preparing",
    containerNumber: null,
    projectNames: ["Sandals Jamaica Montegobay"],
    size: "Flat Rack 40 ft",
    ciNumbers: "31115",
    ciDate: null,
    ciValue: null,
    ciCurrency: null,
    shippingLine: null,
    billOfLading: null,
    etd: "2026-09-04",
    portOfDischarge: "Montegobay",
    eta: "2026-09-11",
    etaJobsite: "2026-09-17",
    freightVendor: null,
    freightCost: null,
    broker: "Marsharpe",
    brokerInvoiceNumber: null,
    budgetedBroker: null,
    brokerRealCost: null,
    brokerPaymentDate: null,
    brokerPaid: false,
    notes:
      "En el Excel original esta fila estaba duplicada (dos veces, idénticas) y traía un 'Broker Variance' de 10,725 escrito a mano sin desglose de presupuestado/real — revisar y completar el costo de broker.",
  },
];

async function main() {
  const bcrypt = (await import("bcryptjs")).default;
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../lib/db");
  const { users, projects, containers, containerProjects } = await import("../lib/db/schema");

  const [, , adminName, adminEmail, adminPassword] = process.argv;
  if (!adminName || !adminEmail || !adminPassword) {
    console.error(
      'Uso: npx tsx scripts/seed.ts "Nombre Admin" correo@caybuilding.com contraseñaTemporal',
    );
    process.exit(1);
  }

  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail.toLowerCase()));
  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(users).values({
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: "admin",
    });
    console.log(`Usuario admin creado: ${adminEmail}`);
  } else {
    console.log(`El usuario ${adminEmail} ya existe, no se modificó.`);
  }

  const projectIdByName = new Map<string, number>();
  for (const p of PROJECTS) {
    const [row] = await db
      .insert(projects)
      .values(p)
      .onConflictDoNothing({ target: projects.name })
      .returning({ id: projects.id });
    if (row) {
      projectIdByName.set(p.name, row.id);
    } else {
      const [existing] = await db.select().from(projects).where(eq(projects.name, p.name));
      if (existing) projectIdByName.set(p.name, existing.id);
    }
  }
  console.log(`Proyectos listos: ${projectIdByName.size}`);

  const existingContainers = await db.select({ n: containers.containerNumber }).from(containers);
  const existingNumbers = new Set(existingContainers.map((c) => c.n).filter(Boolean));

  let inserted = 0;
  for (const c of CONTAINERS) {
    if (c.containerNumber && existingNumbers.has(c.containerNumber)) {
      console.log(`Ya existe ${c.containerNumber}, se omite.`);
      continue;
    }

    const { projectNames, ...values } = c;
    const [row] = await db.insert(containers).values(values).returning({ id: containers.id });

    const projectIds = projectNames
      .map((name) => projectIdByName.get(PROJECT_ALIASES[name] ?? name))
      .filter((id): id is number => typeof id === "number");

    if (projectIds.length) {
      await db.insert(containerProjects).values(
        projectIds.map((projectId) => ({ containerId: row.id, projectId })),
      );
    }
    inserted += 1;
  }
  console.log(`Contenedores insertados: ${inserted}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
