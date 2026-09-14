import { pool } from "@/lib/db";
import { getMessage, listMessages } from "@/lib/agentmail";

export async function syncPurchaseRequests(): Promise<{ inserted: number; scanned: number }> {
  const inboxId = process.env.AGENTMAIL_INBOX_ID;
  if (!inboxId) {
    throw new Error("Falta AGENTMAIL_INBOX_ID en las variables de entorno. Corre 'npm run setup-inbox' primero.");
  }

  const existing = await pool.query<{ agentmail_message_id: string }>(
    "SELECT agentmail_message_id FROM purchase_requests"
  );
  const knownIds = new Set(existing.rows.map((r) => r.agentmail_message_id));

  let scanned = 0;
  let inserted = 0;
  let pageToken: string | undefined = undefined;

  do {
    const page = await listMessages(inboxId, pageToken);
    for (const summary of page.messages) {
      scanned += 1;
      if (knownIds.has(summary.message_id)) continue;

      const full = await getMessage(inboxId, summary.message_id);
      await pool.query(
        `INSERT INTO purchase_requests
           (agentmail_message_id, agentmail_thread_id, from_email, subject, body_text, body_html, received_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (agentmail_message_id) DO NOTHING`,
        [
          full.message_id,
          full.thread_id,
          full.from,
          full.subject ?? null,
          full.text ?? null,
          full.html ?? null,
          full.timestamp,
        ]
      );
      knownIds.add(full.message_id);
      inserted += 1;
    }
    pageToken = page.next_page_token;
  } while (pageToken);

  return { inserted, scanned };
}
