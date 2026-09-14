import { pool } from "@/lib/db";
import NassauDashboard from "@/app/components/NassauDashboard";

export const dynamic = "force-dynamic";

export default async function NassauDashboardPage() {
  const notPaidClause = `(payment_status IS NULL OR payment_status NOT IN ('Paid', 'Cancelled'))`;
  // Para las POs sincronizadas de Odoo, po_date es la fecha real de la orden. created_at solo
  // sirve de respaldo para las facturas de los 3 vendors de credito (que se cargan manualmente),
  // ya que esas no tienen po_date. Sin este COALESCE, todo el reporte mensual quedaba agrupado
  // en el mes en que se sincronizo cada PO en vez del mes real de la compra.
  const effectiveDate = `COALESCE(po_date, created_at::date)`;

  const [
    kpis,
    spendByMonth,
    topVendors,
    spendByProject,
    vendorByMonth,
    projectByMonth,
    upcomingDue,
    recentPOs,
    recentPayments,
  ] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM master_file_entries WHERE location = 'nassau' AND ${notPaidClause}) AS outstanding_total,
        (SELECT COALESCE(SUM(amount), 0) FROM master_file_entries WHERE location = 'nassau' AND ${notPaidClause} AND due_date IS NOT NULL AND due_date < CURRENT_DATE) AS overdue_total,
        (SELECT count(*) FROM master_file_entries WHERE location = 'nassau' AND invoice_file_name IS NULL AND payment_status IS DISTINCT FROM 'Cancelled') AS missing_invoices,
        (SELECT COALESCE(SUM(amount), 0) FROM master_file_entries WHERE location = 'nassau' AND date_trunc('month', ${effectiveDate}) = date_trunc('month', now())) AS spend_this_month
    `),
    pool.query(`
      SELECT to_char(date_trunc('month', ${effectiveDate}), 'YYYY-MM') AS month, SUM(amount) AS total
      FROM master_file_entries
      WHERE location = 'nassau' AND ${effectiveDate} >= now() - interval '12 months'
      GROUP BY 1 ORDER BY 1
    `),
    pool.query(`
      SELECT vendor, SUM(amount) AS total
      FROM master_file_entries
      WHERE location = 'nassau'
      GROUP BY vendor ORDER BY total DESC LIMIT 8
    `),
    pool.query(`
      SELECT COALESCE(NULLIF(project, ''), '(Sin proyecto)') AS project, SUM(amount) AS total
      FROM master_file_entries
      WHERE location = 'nassau'
      GROUP BY 1 ORDER BY total DESC LIMIT 8
    `),
    pool.query(`
      SELECT to_char(date_trunc('month', ${effectiveDate}), 'YYYY-MM') AS month, vendor, SUM(amount) AS total
      FROM master_file_entries
      WHERE location = 'nassau' AND ${effectiveDate} >= now() - interval '12 months'
      GROUP BY 1, 2
    `),
    pool.query(`
      SELECT to_char(date_trunc('month', ${effectiveDate}), 'YYYY-MM') AS month,
             COALESCE(NULLIF(project, ''), '(Sin proyecto)') AS project, SUM(amount) AS total
      FROM master_file_entries
      WHERE location = 'nassau' AND ${effectiveDate} >= now() - interval '12 months'
      GROUP BY 1, 2
    `),
    pool.query(`
      SELECT vendor, po_number, invoice_number, amount, due_date
      FROM master_file_entries
      WHERE location = 'nassau' AND ${notPaidClause}
        AND due_date IS NOT NULL AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '14 days'
      ORDER BY due_date ASC LIMIT 15
    `),
    pool.query(`
      SELECT vendor, po_number, invoice_number, amount, project, created_at
      FROM master_file_entries
      WHERE location = 'nassau'
      ORDER BY created_at DESC LIMIT 8
    `),
    pool.query(`
      SELECT vendor, po_number, invoice_number, amount, paid_on
      FROM master_file_entries
      WHERE location = 'nassau' AND payment_status = 'Paid' AND paid_on IS NOT NULL
      ORDER BY paid_on DESC LIMIT 8
    `),
  ]);

  const num = (v: unknown) => (v != null ? Number(v) : 0);
  // created_at es timestamptz (llega como objeto Date); due_date/paid_on son date (ya llegan como
  // texto plano "YYYY-MM-DD" gracias al type parser en lib/db.ts) - cubrimos ambos casos.
  const dateStr = (v: unknown) => {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).slice(0, 10);
  };

  const data = {
    kpis: {
      outstandingTotal: num(kpis.rows[0].outstanding_total),
      overdueTotal: num(kpis.rows[0].overdue_total),
      missingInvoices: Number(kpis.rows[0].missing_invoices),
      spendThisMonth: num(kpis.rows[0].spend_this_month),
    },
    spendByMonth: spendByMonth.rows.map((r) => ({ month: r.month as string, total: num(r.total) })),
    topVendors: topVendors.rows.map((r) => ({ vendor: r.vendor as string, total: num(r.total) })),
    spendByProject: spendByProject.rows.map((r) => ({ project: r.project as string, total: num(r.total) })),
    vendorByMonth: vendorByMonth.rows.map((r) => ({
      month: r.month as string,
      vendor: r.vendor as string,
      total: num(r.total),
    })),
    projectByMonth: projectByMonth.rows.map((r) => ({
      month: r.month as string,
      project: r.project as string,
      total: num(r.total),
    })),
    upcomingDue: upcomingDue.rows.map((r) => ({
      vendor: r.vendor as string,
      poNumber: r.po_number as string,
      invoiceNumber: r.invoice_number as string | null,
      amount: num(r.amount),
      dueDate: dateStr(r.due_date) as string,
    })),
    recentPOs: recentPOs.rows.map((r) => ({
      vendor: r.vendor as string,
      poNumber: r.po_number as string,
      invoiceNumber: r.invoice_number as string | null,
      amount: num(r.amount),
      project: r.project as string | null,
      createdAt: dateStr(r.created_at) as string,
    })),
    recentPayments: recentPayments.rows.map((r) => ({
      vendor: r.vendor as string,
      poNumber: r.po_number as string,
      invoiceNumber: r.invoice_number as string | null,
      amount: num(r.amount),
      paidOn: dateStr(r.paid_on) as string,
    })),
  };

  return <NassauDashboard data={data} />;
}
