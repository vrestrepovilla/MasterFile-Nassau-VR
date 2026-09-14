import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPriceEntries } from "@/lib/data/price-entries";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const entries = await getPriceEntries();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("USA");

  sheet.columns = [
    { header: "Material", key: "material", width: 55 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Unit cost (Vat included)", key: "unitCost", width: 20 },
    { header: "Vendor", key: "vendor", width: 30 },
    { header: "P.O #", key: "poNumber", width: 10 },
    { header: "Date", key: "date", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const e of entries) {
    sheet.addRow({
      material: e.material,
      unit: e.unit ?? "",
      unitCost: e.unitCost ?? "",
      vendor: e.vendor ?? "",
      poNumber: e.poNumber ?? "",
      date: e.poDate ?? "",
    });
  }

  sheet.getColumn("unitCost").numFmt = "$#,##0.000";
  sheet.getColumn("date").numFmt = "m/d/yyyy";

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Base de Precios USA.xlsx"`,
    },
  });
}
