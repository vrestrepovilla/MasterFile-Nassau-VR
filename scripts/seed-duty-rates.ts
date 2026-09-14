import { config } from "dotenv";
config({ path: ".env.local" });

type DutySeed = {
  merchandise: string;
  technicalDescription: string | null;
  dutyRatePercent: number;
  hsCode: string | null;
  notes: string | null;
};

// From "Calculadora_Brokerage_Nassau.xlsx" -> "Tasas de Duty" sheet.
const RATES: DutySeed[] = [
  { merchandise: "US Gypsum / Drywall Joint Tape", technicalDescription: "Moulded articles of paper pulps", dutyRatePercent: 45, hsCode: "48239000", notes: null },
  { merchandise: "Polyest Resin Drum / LSPC POLYNT", technicalDescription: "Polyacetals, polyethers, epoxide resins", dutyRatePercent: 45, hsCode: "39079000", notes: null },
  { merchandise: "TurboStick Hose PC", technicalDescription: "Tubes, pipes — rubber with fittings", dutyRatePercent: 45, hsCode: "40091200", notes: null },
  { merchandise: "TurboStick Pistol PC / Spray Gun", technicalDescription: "Mechanical appliances — spray guns", dutyRatePercent: 45, hsCode: "84249000", notes: null },
  { merchandise: "Metal Cutting Disc / Grinding Disc", technicalDescription: "Millstones, grindstones — abrasives", dutyRatePercent: 45, hsCode: "68042200", notes: null },
  { merchandise: "Diamond Polishing Pads", technicalDescription: "Millstones, grindstones — abrasives", dutyRatePercent: 45, hsCode: "68042200", notes: null },
  { merchandise: "Roller Cover / Paint Brush", technicalDescription: "Brooms, brushes, rollers", dutyRatePercent: 45, hsCode: "96034000", notes: null },
  { merchandise: "Safety Glasses / Goggles", technicalDescription: "Spectacles, goggles — protective", dutyRatePercent: 45, hsCode: "90049090", notes: null },
  { merchandise: "Nitrile Gloves", technicalDescription: "Rubber gloves / apparel accessories", dutyRatePercent: 45, hsCode: "40151990", notes: null },
  { merchandise: "Mekp Catalyst / Chemical", technicalDescription: "Ethers, peroxides — chemical", dutyRatePercent: 45, hsCode: "29096000", notes: null },
  { merchandise: "Talc Powder", technicalDescription: "Natural steatite, crushed/powdered", dutyRatePercent: 45, hsCode: "25262000", notes: null },
  { merchandise: "Concrete Diamond Turbo Blade", technicalDescription: "Hand saws, blades, saw blades", dutyRatePercent: 25, hsCode: "82029900", notes: null },
  { merchandise: "Drill Bit Set / SDS Drill Bit", technicalDescription: "Interchangeable tools for drills", dutyRatePercent: 25, hsCode: "82075000", notes: null },
  { merchandise: "Hand Tools (vices, clamps, etc.)", technicalDescription: "Hand tools — glaziers, blow lamps", dutyRatePercent: 25, hsCode: "82055900", notes: null },
  { merchandise: "Particulate Filter / HEPA Filter", technicalDescription: "Centrifuges, filtering machinery", dutyRatePercent: 20, hsCode: "84213990", notes: null },
  { merchandise: "4' LED Modern Wrap / LED Lights", technicalDescription: "Electric luminaires — LED", dutyRatePercent: 0, hsCode: "94054200", notes: null },
  { merchandise: "Red Pencils / Crayons", technicalDescription: "Pencils, crayons, pastels", dutyRatePercent: 0, hsCode: "96091000", notes: null },
  { merchandise: "Half Facepiece Respirator", technicalDescription: "Breathing appliances, gas masks", dutyRatePercent: 0, hsCode: "90200000", notes: null },
  { merchandise: "Car Floor Mats", technicalDescription: "Motor vehicle parts & accessories (Excise 60%)", dutyRatePercent: 60, hsCode: "87089990", notes: "60% Excise" },
  { merchandise: "Propane Hand Torch Cylinder", technicalDescription: "Containers compressed/liquefied gas", dutyRatePercent: 25, hsCode: "73110000", notes: null },
  { merchandise: "Weiman Stainless Steel Cleaner", technicalDescription: "Polishes, creams for footwear/floors", dutyRatePercent: 35, hsCode: "34059000", notes: null },
  { merchandise: "Wooden Mixing Sticks", technicalDescription: "Plywood — other wood < 6mm", dutyRatePercent: 0, hsCode: "44129990", notes: null },
  { merchandise: "Mixing Sticks (wood)", technicalDescription: "Plywood panels / veneer", dutyRatePercent: 0, hsCode: "44129990", notes: null },
  { merchandise: "Primer/Adhesive B50B", technicalDescription: "Prepared glues and adhesives", dutyRatePercent: 45, hsCode: "35069900", notes: null },
  { merchandise: "Acetone (Flammable)", technicalDescription: "Ketones — Acetone", dutyRatePercent: 45, hsCode: "29141100", notes: null },
  { merchandise: "High Gloss Black Spray / Paint", technicalDescription: "Paints & varnishes — synthetic polymer", dutyRatePercent: 45, hsCode: "32089090", notes: null },
  { merchandise: "Floor Protection Covering", technicalDescription: "Paper — cellulose, coated/surface-dec.", dutyRatePercent: 45, hsCode: "48119000", notes: null },
  { merchandise: "Armor Mat Rubber Sheet", technicalDescription: "Plates/sheets — vulcanised rubber", dutyRatePercent: 45, hsCode: "40082100", notes: null },
  { merchandise: "SIK ARMATEC / Epoxide Resin", technicalDescription: "Polyacetals, epoxide resins", dutyRatePercent: 45, hsCode: "39073000", notes: null },
  { merchandise: "SIK CRETE / Self Compacting Concrete", technicalDescription: "Prepared binders for foundry moulds", dutyRatePercent: 0, hsCode: "38245000", notes: null },
  { merchandise: "Plywood CDX / Plywood", technicalDescription: "Plywood — other < 6mm", dutyRatePercent: 0, hsCode: "44123900", notes: null },
  { merchandise: "FIBALATH 39x150 (glass fibre)", technicalDescription: "Glass fibres, yarn, woven fabrics", dutyRatePercent: 45, hsCode: "70199000", notes: null },
  { merchandise: "Stucco Blue 1200-80", technicalDescription: "Glaziers putty, resin cements, caulking", dutyRatePercent: 5, hsCode: "32141000", notes: null },
  { merchandise: "White Acrylic Primer/Sealer", technicalDescription: "Paints & varnishes — acrylic/vinyl", dutyRatePercent: 45, hsCode: "32091000", notes: null },
  { merchandise: "Ventec Board", technicalDescription: "Paving blocks/slabs — glass", dutyRatePercent: 45, hsCode: "70169000", notes: null },
  { merchandise: "Armat Classic Caulk", technicalDescription: "Glaziers putty, grafting putty", dutyRatePercent: 5, hsCode: "32141000", notes: null },
  { merchandise: "Fastener / Screws / Bolts", technicalDescription: "Screws, bolts — iron/steel (0%-5%)", dutyRatePercent: 0, hsCode: "73181400", notes: "Puede llegar a 5%" },
  { merchandise: "L-rail / T-rail Aluminium", technicalDescription: "Aluminium bars/rods/profiles", dutyRatePercent: 45, hsCode: "76042900", notes: null },
  { merchandise: "Aluminium Structures", technicalDescription: "Aluminium structures — building", dutyRatePercent: 25, hsCode: "76109000", notes: null },
  { merchandise: "Mesh 38 wide (Glass fibre)", technicalDescription: "Glass fibres", dutyRatePercent: 45, hsCode: "70199000", notes: null },
];

async function main() {
  const { db } = await import("../lib/db");
  const { dutyRates } = await import("../lib/db/schema");

  await db.insert(dutyRates).values(RATES);
  console.log(`Tasas de duty insertadas: ${RATES.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
