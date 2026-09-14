import { NextResponse } from "next/server";
import { backupMasterFileToDrive } from "@/lib/masterFileBackup";

export async function POST() {
  try {
    await backupMasterFileToDrive();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo respaldar el Master File en Drive." },
      { status: 500 }
    );
  }
}
