const BASE_URL = "https://api.agentmail.to/v0";

function apiKey(): string {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) {
    throw new Error("Falta AGENTMAIL_API_KEY en las variables de entorno.");
  }
  return key;
}

async function agentmailFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AgentMail ${init?.method ?? "GET"} ${path} -> ${res.status}: ${body}`);
  }

  return res.json();
}

export type AgentMailInbox = {
  inbox_id: string;
  email: string;
  display_name?: string;
};

export type AgentMailAttachment = {
  attachment_id: string;
  filename?: string;
  content_type?: string;
  size?: number;
};

export type AgentMailMessageSummary = {
  message_id: string;
  thread_id: string;
  from: string;
  to: string[];
  subject?: string;
  preview?: string;
  timestamp: string;
};

export type AgentMailMessage = AgentMailMessageSummary & {
  text?: string;
  html?: string;
  attachments?: AgentMailAttachment[];
};

export async function listInboxes(): Promise<AgentMailInbox[]> {
  const data = await agentmailFetch("/inboxes");
  return data.inboxes ?? [];
}

export async function createInbox(username: string, displayName?: string): Promise<AgentMailInbox> {
  return agentmailFetch("/inboxes", {
    method: "POST",
    body: JSON.stringify({ username, display_name: displayName }),
  });
}

export async function findOrCreateInbox(username: string, displayName?: string): Promise<AgentMailInbox> {
  const inboxes = await listInboxes();
  const existing = inboxes.find((i) => i.email.toLowerCase().startsWith(`${username.toLowerCase()}@`));
  if (existing) return existing;
  return createInbox(username, displayName);
}

export async function listMessages(inboxId: string, pageToken?: string): Promise<{
  messages: AgentMailMessageSummary[];
  next_page_token?: string;
}> {
  const params = new URLSearchParams({ limit: "50" });
  if (pageToken) params.set("page_token", pageToken);
  return agentmailFetch(`/inboxes/${inboxId}/messages?${params.toString()}`);
}

export async function getMessage(inboxId: string, messageId: string): Promise<AgentMailMessage> {
  return agentmailFetch(`/inboxes/${inboxId}/messages/${messageId}`);
}
