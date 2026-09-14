import { pool } from "@/lib/db";

const AGENTMAIL_BASE_URL = "https://api.agentmail.to/v0";
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

function apiKey(): string {
  const key = process.env.AGENTMAIL_NASSAU_API_KEY;
  if (!key) throw new Error("Falta AGENTMAIL_NASSAU_API_KEY en .env.local");
  return key;
}

function inboxId(): string {
  const id = process.env.AGENTMAIL_NASSAU_INBOX_ID;
  if (!id) throw new Error("Falta AGENTMAIL_NASSAU_INBOX_ID en .env.local");
  return id;
}

async function agentmailFetch(path: string) {
  const res = await fetch(`${AGENTMAIL_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AgentMail GET ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

type AgentMailAttachmentRef = {
  attachment_id: string;
  filename?: string;
  content_type?: string;
  content_disposition?: string;
};

type AgentMailMessage = {
  message_id: string;
  from: string;
  subject?: string;
  timestamp: string;
  attachments?: AgentMailAttachmentRef[];
};

// --- Coincidencia de numero de factura (misma logica que scripts/attach-nassau-invoices.mjs) ---

type Candidate = { id: string; invoice_number: string; vendor: string; po_number: string };

function normalizeInvoiceKey(s: string): string {
  return s.replace(/-/g, "").replace(/^0+(?=.)/, "").toLowerCase();
}

// "Invoice #TA3739753.pdf", "Invoice#4720.pdf", "Invoice 1259- Ace.pdf" -> "TA3739753" / "4720" / "1259"
function extractInvoiceNumber(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, "");
  const hashIdx = base.lastIndexOf("#");
  if (hashIdx !== -1) {
    let rest = base.slice(hashIdx + 1).trim();
    rest = rest.replace(/\(\d+\)\s*$/, "").trim();
    return rest || null;
  }
  const m = base.match(/Invoic[ed]e?\s+([A-Za-z0-9]+)/i);
  return m ? m[1] : null;
}

function buildInvoiceIndex(rows: Candidate[]) {
  const byFull = new Map<string, Candidate[]>();
  const byPart = new Map<string, Candidate[]>();
  for (const r of rows) {
    const fullKey = normalizeInvoiceKey(r.invoice_number.trim());
    if (!byFull.has(fullKey)) byFull.set(fullKey, []);
    byFull.get(fullKey)!.push(r);

    const parts = r.invoice_number
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      for (const p of parts) {
        if (p.length < 4) continue;
        const key = normalizeInvoiceKey(p);
        if (!byPart.has(key)) byPart.set(key, []);
        byPart.get(key)!.push(r);
      }
    }
  }
  return { byFull, byPart };
}

function findMatch(
  index: { byFull: Map<string, Candidate[]>; byPart: Map<string, Candidate[]> },
  extractedKey: string
): Candidate | null {
  let matches = index.byFull.get(extractedKey);
  if (!matches) {
    matches = index.byFull.get(normalizeInvoiceKey(`${extractedKey}/1`)) ?? index.byFull.get(normalizeInvoiceKey(`${extractedKey}/2`));
  }
  if (!matches) matches = index.byPart.get(extractedKey);
  if (!matches || matches.length !== 1) return null;
  return matches[0];
}

export type NassauInvoiceSyncResult = {
  messagesScanned: number;
  attachmentsSeen: number;
  pendingCreated: number;
};

export async function syncNassauInvoiceEmails(): Promise<NassauInvoiceSyncResult> {
  const inbox = inboxId();

  const known = await pool.query<{ agentmail_message_id: string; agentmail_attachment_id: string }>(
    "SELECT agentmail_message_id, agentmail_attachment_id FROM nassau_invoice_matches"
  );
  const knownPairs = new Set(known.rows.map((r) => `${r.agentmail_message_id}:${r.agentmail_attachment_id}`));

  const { rows: candidateRows } = await pool.query<Candidate>(
    "SELECT id, invoice_number, vendor, po_number FROM master_file_entries WHERE location = 'nassau' AND invoice_number IS NOT NULL"
  );
  const index = buildInvoiceIndex(candidateRows);

  let messagesScanned = 0;
  let attachmentsSeen = 0;
  let pendingCreated = 0;
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ limit: "50" });
    if (pageToken) params.set("page_token", pageToken);
    const page = await agentmailFetch(`/inboxes/${inbox}/messages?${params.toString()}`);

    for (const summary of page.messages ?? []) {
      messagesScanned += 1;
      const full: AgentMailMessage = await agentmailFetch(`/inboxes/${inbox}/messages/${summary.message_id}`);
      const attachments = full.attachments ?? [];

      for (const att of attachments) {
        attachmentsSeen += 1;
        if (knownPairs.has(`${full.message_id}:${att.attachment_id}`)) continue;
        if (att.content_disposition === "inline") continue; // imagenes de firma de correo, logos, etc.
        if (!att.content_type || !ALLOWED_ATTACHMENT_TYPES.has(att.content_type)) continue;

        const meta = await agentmailFetch(
          `/inboxes/${inbox}/messages/${full.message_id}/attachments/${att.attachment_id}`
        );
        const fileRes = await fetch(meta.download_url);
        if (!fileRes.ok) continue;
        const buffer = Buffer.from(await fileRes.arrayBuffer());

        const filename = att.filename || meta.filename || "factura";
        const invoiceKey = extractInvoiceNumber(filename);
        const match = invoiceKey ? findMatch(index, normalizeInvoiceKey(invoiceKey)) : null;

        await pool.query(
          `INSERT INTO nassau_invoice_matches
             (agentmail_message_id, agentmail_attachment_id, from_email, subject, received_at,
              attachment_filename, attachment_content_type, attachment_data,
              extracted_invoice_number, suggested_entry_id, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
           ON CONFLICT (agentmail_message_id, agentmail_attachment_id) DO NOTHING`,
          [
            full.message_id,
            att.attachment_id,
            full.from,
            full.subject ?? null,
            full.timestamp,
            filename,
            att.content_type,
            buffer,
            invoiceKey,
            match?.id ?? null,
          ]
        );
        pendingCreated += 1;
      }
    }

    pageToken = page.next_page_token;
  } while (pageToken);

  return { messagesScanned, attachmentsSeen, pendingCreated };
}
