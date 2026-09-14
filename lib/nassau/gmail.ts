import { google } from "googleapis";

// Same Nassau Google identity as lib/nassau/google-drive.ts — already
// authorized with gmail.compose scope alongside drive.
function getGmailClient() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Faltan credenciales de Google (Nassau) en .env.local");
  }
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth });
}

export type DraftAttachment = {
  filename: string;
  mimeType: string;
  content: Buffer;
};

function encodeHeaderWord(text: string) {
  // RFC 2047 encoded-word, so accented characters in the subject don't break MIME.
  return `=?UTF-8?B?${Buffer.from(text, "utf-8").toString("base64")}?=`;
}

function buildRawMessage(opts: {
  to: string;
  cc?: string;
  subject: string;
  bodyText: string;
  attachments: DraftAttachment[];
}): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [];

  lines.push(`To: ${opts.to}`);
  if (opts.cc) lines.push(`Cc: ${opts.cc}`);
  lines.push(`Subject: ${encodeHeaderWord(opts.subject)}`);
  lines.push("MIME-Version: 1.0");
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push("");
  lines.push(`--${boundary}`);
  lines.push("Content-Type: text/plain; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: 7bit");
  lines.push("");
  lines.push(opts.bodyText);
  lines.push("");

  for (const att of opts.attachments) {
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
    lines.push("Content-Transfer-Encoding: base64");
    lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    lines.push("");
    lines.push(att.content.toString("base64").replace(/(.{76})/g, "$1\n"));
    lines.push("");
  }
  lines.push(`--${boundary}--`);

  return lines.join("\r\n");
}

export async function createDraftWithAttachments(opts: {
  to: string;
  cc?: string;
  subject: string;
  bodyText: string;
  attachments: DraftAttachment[];
}): Promise<string> {
  const gmail = getGmailClient();
  const raw = buildRawMessage(opts);
  const encoded = Buffer.from(raw, "utf-8").toString("base64url");

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw: encoded } },
  });
  if (!res.data.id) throw new Error("Gmail no devolvio un id de borrador.");
  return res.data.id;
}
