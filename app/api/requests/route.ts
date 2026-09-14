import { NextResponse } from "next/server";
import { getPurchaseRequests } from "@/lib/queries";

export async function GET() {
  const requests = await getPurchaseRequests();
  return NextResponse.json({ requests });
}
