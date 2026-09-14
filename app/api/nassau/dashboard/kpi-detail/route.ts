import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const EFFECTIVE_DATE = `COALESCE(po_date, created_at::date)`;
const NO_PROJECT_LABEL = "(Sin proyecto)";

export type KpiDetailRow = {
  vendor: string;
  poNumber: string;
  invoiceNumber: string | null;
  amount: number;
  project: string | null;
  date: string | null;
};

type KpiType = "outstanding" | "overdue" | "missing_invoices" | "spend_this_month" | "vendor" | "project";

const FIXED_TITLES: Partial<Record<KpiType, string>> = {
  outstanding: "Debemos ahora",
  overdue: "Vencido",
  missing_invoices: "Facturas sin montar",
  spend_this_month: "Gasto este mes",
};

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") as KpiType | null;
  const name = req.nextUrl.searchParams.get("name");
  const month = req.nextUrl.searchParams.get("month");

  if (!type || (type !== "vendor" && type !== "project" && !FIXED_TITLES[type])) {
    return NextResponse.json({ error: "Tipo invalido." }, { status: 400 });
  }
  if ((type === "vendor" || type === "project") && !name) {
    return NextResponse.json({ error: "Falta el nombre." }, { status: 400 });
  }

  const notPaidClause = `(payment_status IS NULL OR payment_status NOT IN ('Paid', 'Cancelled'))`;
  const params: unknown[] = [];
  let sql: string;
  let title: string;

  switch (type) {
    case "outstanding":
      sql = `
        SELECT vendor, po_number, invoice_number, amount, project, due_date AS date
        FROM master_file_entries
        WHERE location = 'nassau' AND ${notPaidClause}
        ORDER BY due_date ASC NULLS LAST, amount DESC
      `;
      title = FIXED_TITLES.outstanding!;
      break;
    case "overdue":
      sql = `
        SELECT vendor, po_number, invoice_number, amount, project, due_date AS date
        FROM master_file_entries
        WHERE location = 'nassau' AND ${notPaidClause}
          AND due_date IS NOT NULL AND due_date < CURRENT_DATE
        ORDER BY due_date ASC
      `;
      title = FIXED_TITLES.overdue!;
      break;
    case "missing_invoices":
      sql = `
        SELECT vendor, po_number, NULL AS invoice_number, amount, project, ${EFFECTIVE_DATE} AS date
        FROM master_file_entries
        WHERE location = 'nassau' AND invoice_file_name IS NULL
          AND payment_status IS DISTINCT FROM 'Cancelled'
        ORDER BY ${EFFECTIVE_DATE} DESC
      `;
      title = FIXED_TITLES.missing_invoices!;
      break;
    case "spend_this_month":
      sql = `
        SELECT vendor, po_number, invoice_number, amount, project, ${EFFECTIVE_DATE} AS date
        FROM master_file_entries
        WHERE location = 'nassau' AND date_trunc('month', ${EFFECTIVE_DATE}) = date_trunc('month', now())
        ORDER BY ${EFFECTIVE_DATE} DESC
      `;
      title = FIXED_TITLES.spend_this_month!;
      break;
    case "vendor": {
      params.push(name);
      let monthClause = "";
      if (month) {
        params.push(month);
        monthClause = `AND to_char(date_trunc('month', ${EFFECTIVE_DATE}), 'YYYY-MM') = $${params.length}`;
      }
      sql = `
        SELECT vendor, po_number, invoice_number, amount, project, ${EFFECTIVE_DATE} AS date
        FROM master_file_entries
        WHERE location = 'nassau' AND vendor = $1 ${monthClause}
        ORDER BY ${EFFECTIVE_DATE} DESC
      `;
      title = `${name} ${month ? `— ${monthLabel(month)}` : "— Total historico"}`;
      break;
    }
    case "project": {
      let projectClause: string;
      if (name === NO_PROJECT_LABEL) {
        projectClause = `(project IS NULL OR project = '')`;
      } else {
        params.push(name);
        projectClause = `project = $${params.length}`;
      }
      let monthClause = "";
      if (month) {
        params.push(month);
        monthClause = `AND to_char(date_trunc('month', ${EFFECTIVE_DATE}), 'YYYY-MM') = $${params.length}`;
      }
      sql = `
        SELECT vendor, po_number, invoice_number, amount, project, ${EFFECTIVE_DATE} AS date
        FROM master_file_entries
        WHERE location = 'nassau' AND ${projectClause} ${monthClause}
        ORDER BY ${EFFECTIVE_DATE} DESC
      `;
      title = `${name} ${month ? `— ${monthLabel(month)}` : "— Total historico"}`;
      break;
    }
  }

  const { rows } = await pool.query(sql, params);
  const num = (v: unknown) => (v != null ? Number(v) : 0);
  const dateStr = (v: unknown) => {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).slice(0, 10);
  };

  const detailRows: KpiDetailRow[] = rows.map((r) => ({
    vendor: r.vendor as string,
    poNumber: r.po_number as string,
    invoiceNumber: r.invoice_number as string | null,
    amount: num(r.amount),
    project: r.project as string | null,
    date: dateStr(r.date),
  }));

  const total = detailRows.reduce((sum, r) => sum + r.amount, 0);

  return NextResponse.json({ title, rows: detailRows, total });
}
