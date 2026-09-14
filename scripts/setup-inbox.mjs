import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
dotenv.config({ path: envPath });
const USERNAME = "cargocaybuilding";
const BASE_URL = "https://api.agentmail.to/v0";

async function agentmailFetch(path, init) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`AgentMail ${init?.method ?? "GET"} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  if (!process.env.AGENTMAIL_API_KEY) {
    console.error("Falta AGENTMAIL_API_KEY en .env.local. Pega tu API key ahi primero.");
    process.exit(1);
  }

  const { inboxes } = await agentmailFetch("/inboxes");
  let inbox = (inboxes ?? []).find((i) =>
    i.email.toLowerCase().startsWith(`${USERNAME.toLowerCase()}@`)
  );

  if (inbox) {
    console.log(`Ya existe el inbox: ${inbox.email} (${inbox.inbox_id})`);
  } else {
    inbox = await agentmailFetch("/inboxes", {
      method: "POST",
      body: JSON.stringify({ username: USERNAME, display_name: "Cay Building - Compras" }),
    });
    console.log(`Inbox creado: ${inbox.email} (${inbox.inbox_id})`);
  }

  if (existsSync(envPath)) {
    let content = readFileSync(envPath, "utf8");
    content = content.includes("AGENTMAIL_INBOX_ID=")
      ? content.replace(/AGENTMAIL_INBOX_ID=.*/g, `AGENTMAIL_INBOX_ID=${inbox.inbox_id}`)
      : `${content}\nAGENTMAIL_INBOX_ID=${inbox.inbox_id}\n`;
    content = content.includes("AGENTMAIL_INBOX_EMAIL=")
      ? content.replace(/AGENTMAIL_INBOX_EMAIL=.*/g, `AGENTMAIL_INBOX_EMAIL=${inbox.email}`)
      : `${content}\nAGENTMAIL_INBOX_EMAIL=${inbox.email}\n`;
    writeFileSync(envPath, content);
    console.log("Actualizado .env.local con AGENTMAIL_INBOX_ID y AGENTMAIL_INBOX_EMAIL.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
