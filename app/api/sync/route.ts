import { NextResponse } from "next/server";
import { syncPurchaseRequests } from "@/lib/sync";

export async function POST() {
  try {
    const result = await syncPurchaseRequests();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
