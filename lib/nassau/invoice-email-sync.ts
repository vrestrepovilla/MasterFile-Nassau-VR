import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { nassauInvoiceMatches, nassauMasterFileEntries } from "@/lib/db/schema";
import { uploadNassauInvoiceFile } from "@/lib/nassau/google-drive";

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

// --- Invoice-number matching (same heuristic as the source app) ---

type Candidate = { id: string; invoiceNumber: string; vendor: string; poNumber: string };

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
    const fullKey = normalizeInvoiceKey(r.invoiceNumber.trim());
    if (!byFull.has(fullKey)) byFull.set(fullKey, []);
    byFull.get(fullKey)!.push(r);

    const parts = r.invoiceNumber
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
  extractedKey: string,
): Candidate | null {
  let matches = index.byFull.get(extractedKey);
  if (!matches) {
    matches =
      index.byFull.get(normalizeInvoiceKey(`${extractedKey}/1`)) ??
      index.byFull.get(normalizeInvoiceKey(`${extractedKey}/2`));
  }
  if (!matches) matches = index.byPart.get(extractedKey);
  if (!matches || matches.length !== 1) return null;
  return matches[0];
}

export type NassauInvoiceEmailSyncResult = {
  messagesScanned: number;
  attachmentsSeen: number;
  pendingCreated: number;
};

// Polls the Nassau invoice inbox for new attachments, tries to match each
// one to an open master file entry by invoice number, and files it in
// Drive right away — under the matched vendor's folder when found, or an
// "Unmatched" holding folder otherwise — so nothing sits as an unstored
// blob waiting on manual review the way the source app did.
export async function syncNassauInvoiceEmails(): Promise<NassauInvoiceEmailSyncResult> {
  const inbox = inboxId();

  const known = await db
    .select({
      agentmailMessageId: nassauInvoiceMatches.agentmailMessageId,
      agentmailAttachmentId: nassauInvoiceMatches.agentmailAttachmentId,
    })
    .from(nassauInvoiceMatches);
  const knownPairs = new Set(known.map((r) => `${r.agentmailMessageId}:${r.agentmailAttachmentId}`));

  const candidateRows = await db
    .select({
      id: nassauMasterFileEntries.id,
      invoiceNumber: nassauMasterFileEntries.invoiceNumber,
      vendor: nassauMasterFileEntries.vendor,
      poNumber: nassauMasterFileEntries.poNumber,
    })
    .from(nassauMasterFileEntries)
    .where(isNotNull(nassauMasterFileEntries.invoiceNumber));
  const candidates: Candidate[] = candidateRows
    .filter((r): r is typeof r & { invoiceNumber: string } => r.invoiceNumber != null)
    .map((r) => ({ id: r.id, invoiceNumber: r.invoiceNumber, vendor: r.vendor, poNumber: r.poNumber }));
  const index = buildInvoiceIndex(candidates);

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
        if (att.content_disposition === "inline") continue; // email signature images, logos, etc.
        if (!att.content_type || !ALLOWED_ATTACHMENT_TYPES.has(att.content_type)) continue;

        const meta = await agentmailFetch(
          `/inboxes/${inbox}/messages/${full.message_id}/attachments/${att.attachment_id}`,
        );
        const fileRes = await fetch(meta.download_url);
        if (!fileRes.ok) continue;
        const buffer = Buffer.from(await fileRes.arrayBuffer());

        const filename = att.filename || meta.filename || "factura";
        const invoiceKey = extractInvoiceNumber(filename);
        const match = invoiceKey ? findMatch(index, normalizeInvoiceKey(invoiceKey)) : null;

        const driveId = await uploadNassauInvoiceFile(
          buffer,
          filename,
          att.content_type,
          match?.vendor ?? "Unmatched",
        );

        await db
          .insert(nassauInvoiceMatches)
          .values({
            agentmailMessageId: full.message_id,
            agentmailAttachmentId: att.attachment_id,
            fromEmail: full.from,
            subject: full.subject ?? null,
            receivedAt: new Date(full.timestamp),
            attachmentFileName: filename,
            attachmentContentType: att.content_type,
            attachmentDriveId: driveId,
            extractedInvoiceNumber: invoiceKey,
            suggestedEntryId: match?.id ?? null,
            status: "pending",
          })
          .onConflictDoNothing();
        pendingCreated += 1;
      }
    }

    pageToken = page.next_page_token;
  } while (pageToken);

  return { messagesScanned, attachmentsSeen, pendingCreated };
}
