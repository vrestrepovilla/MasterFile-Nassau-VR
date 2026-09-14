import { extractText, getDocumentProxy } from "unpdf";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { priceEntries } from "@/lib/db/schema";

export type ExtractedPriceLine = {
  material: string;
  unit: string;
  unitCost: number;
};

export type ExtractedPo = {
  poNumber: string;
  poDate: string; // ISO yyyy-mm-dd
  vendor: string;
  lines: ExtractedPriceLine[];
};

// unpdf (pdfjs-dist under the hood) lays out each line item roughly as:
//   1.00 4.00
//   $260.950 $260.950 $1,043.80
//   EA EA
//   001
//   5G N5081X WB CEILING PNT BASE 1
//   Color Number: OC-117   (optional)
//   Color Name: Simply White (optional)
// — the "1.00" and qty can share a line, or the line number can land on the
// same line as the price when a page break falls awkwardly, so whitespace
// between fields is kept flexible.
const ITEM_RE =
  /\d{3}\s+\$([\d,]+\.\d+)\s+1\.00\s*\n([A-Z]+)\s+\$[\d,]+\.\d+\s+[\d,]+\.\d+\s*\n[A-Z]+\s+\$[\d,]+\.\d+\s*\n([^\n]+)(?:\nColor Number:\s*([^\n]+))?(?:\nColor Name:\s*([^\n]+))?/g;

function toIsoDate(mdY: string): string | null {
  const m = mdY.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// Applitech Purchase Order PDFs only — parses the header (P.O#, date, vendor)
// and every line item's per-unit list price. Returns null if this doesn't
// look like an Applitech P.O. (e.g. a scanned invoice or unrelated file), so
// callers can skip price extraction without treating it as a hard error.
export async function extractPoPrices(bytes: Buffer): Promise<ExtractedPo | null> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });

  const poMatch = text.match(/PO Number\s*:\s*(\d+)/);
  const dateMatch = text.match(/PO Date:\s*([\d/]+)/);
  if (!poMatch || !dateMatch) return null;

  const isoDate = toIsoDate(dateMatch[1]);
  if (!isoDate) return null;

  // The real vendor name is the first clean "Vendor <Name>" line, appearing
  // right after the address block — later "Vendor Contact/Phone/Email:"
  // header lines always carry a colon, so filtering those out is enough.
  const vendorCandidates = Array.from(text.matchAll(/^Vendor ([^\n]+)$/gm))
    .map((m) => m[1].trim())
    .filter((v) => v && !v.includes(":"));
  if (vendorCandidates.length === 0) return null;

  const lines: ExtractedPriceLine[] = [];
  for (const m of text.matchAll(ITEM_RE)) {
    const [, listPriceRaw, unit, descriptionRaw, colorNumber, colorName] = m;
    const unitCost = Number(listPriceRaw.replace(/,/g, ""));
    if (!Number.isFinite(unitCost) || unitCost <= 0) continue;

    let material = descriptionRaw.trim();
    const colorBits = [colorNumber?.trim(), colorName?.trim()].filter(Boolean).join(" ");
    if (colorBits) material = `${material} (Color: ${colorBits})`;

    lines.push({ material, unit, unitCost });
  }

  if (lines.length === 0) return null;

  return {
    poNumber: poMatch[1],
    poDate: isoDate,
    vendor: vendorCandidates[0],
    lines,
  };
}

// Best-effort: feeds the USA price database from a P.O. PDF (freshly
// uploaded, or picked up by the Drive sync). Skips silently if the PDF
// doesn't parse (not an Applitech P.O. layout) or if this P.O# was already
// extracted before, so re-processing the same file never duplicates.
export async function syncPricesFromPo(bytes: Buffer): Promise<boolean> {
  const extracted = await extractPoPrices(bytes).catch(() => null);
  if (!extracted) return false;

  const [existing] = await db
    .select({ id: priceEntries.id })
    .from(priceEntries)
    .where(eq(priceEntries.poNumber, extracted.poNumber))
    .limit(1);
  if (existing) return false;

  await db.insert(priceEntries).values(
    extracted.lines.map((line) => ({
      material: line.material,
      unit: line.unit,
      unitCost: line.unitCost,
      vendor: extracted.vendor,
      poNumber: extracted.poNumber,
      poDate: extracted.poDate,
    })),
  );

  revalidatePath("/compras/precios");
  return true;
}
