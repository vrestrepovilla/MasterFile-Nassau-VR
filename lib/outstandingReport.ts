import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { pool } from "@/lib/db";
import { downloadFileFromDrive } from "@/lib/googleDrive";
import { OUTSTANDING_INVOICE_VENDORS, sortByInvoiceNumber, projectDisplayName } from "@/lib/outstandingInvoices";

const THIN_BORDER = { style: "thin" as const, color: { argb: "FF000000" } };
const ALL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };
const GRAY_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
const RED = "FFC00000";
const CURRENCY_FMT = '"$"#,##0.00';

export async function buildOutstandingExcelBuffer(entryIds: string[], dueDate: string | null): Promise<Buffer> {
  const { rows } = await pool.query(
    `SELECT vendor, invoice_number, amount, project
     FROM master_file_entries
     WHERE id = ANY($1) AND location = 'nassau' AND vendor = ANY($2)`,
    [entryIds, OUTSTANDING_INVOICE_VENDORS]
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Hoja 1");
  sheet.columns = [
    { key: "a", width: 4 },
    { key: "b", width: 26 },
    { key: "c", width: 14 },
    { key: "d", width: 13 },
    { key: "e", width: 24 },
  ];

  let currentRow = 1;
  const vendorTotalRows: number[] = [];

  for (const vendor of OUTSTANDING_INVOICE_VENDORS) {
    const vendorEntries = sortByInvoiceNumber(
      rows
        .filter((r) => r.vendor === vendor)
        .map((r) => ({
          invoiceNumber: r.invoice_number as string | null,
          amount: r.amount != null ? Number(r.amount) : 0,
          project: (r.project as string | null) ?? "",
        }))
    );
    if (vendorEntries.length === 0) continue;

    currentRow += 1;
    const headerRow = sheet.getRow(currentRow);
    headerRow.getCell("b").value = vendor;
    headerRow.getCell("c").value = "Amount";
    headerRow.getCell("d").value = "Due Date";
    headerRow.getCell("e").value = "Project";
    for (const col of ["b", "c", "d", "e"] as const) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: col === "b" ? { argb: RED } : undefined };
      cell.fill = GRAY_FILL;
      cell.border = ALL_BORDERS;
    }

    const firstDataRow = currentRow + 1;
    for (const entry of vendorEntries) {
      currentRow += 1;
      const row = sheet.getRow(currentRow);
      row.getCell("b").value = entry.invoiceNumber ? `Invoice #${entry.invoiceNumber}` : "Invoice #-";
      row.getCell("c").value = entry.amount;
      row.getCell("c").numFmt = CURRENCY_FMT;
      if (dueDate) {
        row.getCell("d").value = new Date(`${dueDate}T00:00:00`);
        row.getCell("d").numFmt = "m/d/yy";
      }
      row.getCell("e").value = projectDisplayName(entry.project);
      for (const col of ["b", "c", "d", "e"] as const) row.getCell(col).border = ALL_BORDERS;
    }
    const lastDataRow = currentRow;

    currentRow += 1;
    const totalRow = sheet.getRow(currentRow);
    totalRow.getCell("b").value = "Total";
    totalRow.getCell("c").value = { formula: `SUM(C${firstDataRow}:C${lastDataRow})` };
    totalRow.getCell("c").numFmt = CURRENCY_FMT;
    for (const col of ["b", "c", "d", "e"] as const) {
      const cell = totalRow.getCell(col);
      cell.font = { bold: true };
      cell.fill = GRAY_FILL;
      cell.border = ALL_BORDERS;
    }
    vendorTotalRows.push(currentRow);

    currentRow += 1;
  }

  if (vendorTotalRows.length > 0) {
    currentRow += 1;
    const grandTotalRowNum = currentRow;
    sheet.mergeCells(`C${grandTotalRowNum}:E${grandTotalRowNum}`);
    const grandRow = sheet.getRow(grandTotalRowNum);
    grandRow.getCell("b").value = "TOTAL INVOICES";
    grandRow.getCell("b").font = { bold: true };
    grandRow.getCell("c").value = { formula: vendorTotalRows.map((r) => `C${r}`).join("+") };
    grandRow.getCell("c").numFmt = CURRENCY_FMT;
    grandRow.getCell("c").font = { bold: true, color: { argb: RED } };
    for (const col of ["b", "c", "d", "e"] as const) {
      grandRow.getCell(col).fill = GRAY_FILL;
      grandRow.getCell(col).border = ALL_BORDERS;
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function buildVendorInvoicesPdf(
  vendor: string,
  entryIds: string[]
): Promise<{ buffer: Buffer; skipped: string[] }> {
  const { rows } = await pool.query(
    `SELECT invoice_number, invoice_file_name, invoice_file_content_type, invoice_file_drive_id
     FROM master_file_entries
     WHERE id = ANY($1) AND location = 'nassau' AND vendor = $2`,
    [entryIds, vendor]
  );

  const sorted = sortByInvoiceNumber(
    rows.map((r) => ({
      invoiceNumber: r.invoice_number as string | null,
      fileName: r.invoice_file_name as string | null,
      contentType: r.invoice_file_content_type as string | null,
      driveId: r.invoice_file_drive_id as string | null,
    }))
  );

  const out = await PDFDocument.create();
  const skipped: string[] = [];

  for (const entry of sorted) {
    if (!entry.driveId) {
      skipped.push(entry.fileName ?? entry.invoiceNumber ?? "(sin nombre)");
      continue;
    }
    try {
      const bytes = await downloadFileFromDrive(entry.driveId);
      const contentType = entry.contentType ?? "";

      if (contentType === "application/pdf") {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } else if (contentType === "image/jpeg" || contentType === "image/png") {
        const image = contentType === "image/jpeg" ? await out.embedJpg(bytes) : await out.embedPng(bytes);
        const page = out.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      } else {
        skipped.push(entry.fileName ?? entry.invoiceNumber ?? "(sin nombre)");
      }
    } catch {
      skipped.push(entry.fileName ?? entry.invoiceNumber ?? "(sin nombre)");
    }
  }

  const bytes = await out.save();
  return { buffer: Buffer.from(bytes), skipped };
}
