import { getEvents, getRequest } from "@/lib/data-store";
import { connection, NextResponse } from "next/server";

export async function GET(_: Request, { params }: RouteContext<"/api/requests/[requestId]">) {
  await connection();
  const { requestId } = await params;
  const request = await getRequest(requestId);
  if (!request) return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
  return NextResponse.json({ data: request, events: await getEvents(requestId) });
}
