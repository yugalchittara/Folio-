import { getEvents, getRequest } from "@/lib/local-db";
import { connection, NextResponse } from "next/server";

export async function GET(_: Request, { params }: RouteContext<"/api/requests/[requestId]">) {
  await connection();
  const { requestId } = await params;
  const request = getRequest(requestId);
  if (!request) return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
  return NextResponse.json({ data: request, events: getEvents(requestId) });
}
