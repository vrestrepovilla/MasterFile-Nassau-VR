// Uso: primero pon GOOGLE_DRIVE_CLIENT_ID y GOOGLE_DRIVE_CLIENT_SECRET en .env.local, luego:
//   node scripts/google-drive-auth.mjs
// Abre la URL que imprime en tu navegador, inicia sesion con tu cuenta @caybuilding.com y autoriza.
// Al terminar, imprime el refresh token para que lo guardes en .env.local.

import http from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Falta GOOGLE_DRIVE_CLIENT_ID o GOOGLE_DRIVE_CLIENT_SECRET en .env.local");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// drive: se necesita el scope completo (no drive.file) porque escribimos dentro de una carpeta
// que ya existe en el Drive de la usuaria (compartida con ella), no solo archivos creados por la app.
// gmail.compose: solo para crear borradores de correo (nunca para leer el correo ni enviar solo).
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/gmail.compose"],
});

console.log("\nAbre esta URL en tu navegador y autoriza el acceso con tu cuenta de Google:\n");
console.log(authUrl);
console.log("\nEsperando a que autorices...\n");

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.url.startsWith("/oauth2callback")) {
    res.end("");
    return;
  }
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.end("Hubo un error autorizando. Puedes cerrar esta pestana y revisar la terminal.");
    console.error("Error de autorizacion:", error || "no llego el codigo");
    server.close();
    process.exit(1);
  }

  res.end("Listo! Ya puedes cerrar esta pestana y volver a la terminal.");
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      console.error(
        "\nGoogle no devolvio un refresh token. Vuelve a intentar (a veces pasa si ya habias autorizado antes - revoca el acceso en https://myaccount.google.com/permissions y vuelve a correr este script)."
      );
      process.exit(1);
    }
    console.log("\nListo! Guarda esta linea en tu .env.local:\n");
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("");
    process.exit(0);
  } catch (err) {
    console.error("Error obteniendo el token:", err);
    process.exit(1);
  }
});

server.listen(PORT);
