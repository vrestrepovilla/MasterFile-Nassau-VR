import { google } from "googleapis";

// Reads a specific tab of a Google Sheet as CSV via the same authenticated
// Drive/Docs identity used elsewhere (lib/google-drive.ts) — this hits the
// docs.google.com export endpoint directly rather than the Sheets API, so it
// works with the `drive` OAuth scope already granted, with nothing new to
// enable in Google Cloud.
function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

// Minimal RFC4180 CSV parser — handles quoted fields with embedded commas,
// quotes ("") and newlines, which plain string.split(",")/("\n") can't.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export async function fetchSheetTabAsRows(
  spreadsheetId: string,
  gid: string,
): Promise<string[][]> {
  const oauth2Client = getOAuthClient();
  const { token } = await oauth2Client.getAccessToken();

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Failed to export sheet ${spreadsheetId} (gid ${gid}): ${res.status}`);
  }
  const text = await res.text();
  return parseCsv(text);
}
