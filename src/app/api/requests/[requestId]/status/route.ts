import { updateStatus } from "@/lib/local-db";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: RouteContext<"/api/requests/[requestId]/status">) {
  const { requestId } = await params;
  const body = await request.json();
  if (!body.status) return NextResponse.json({ error: "status is required" }, { status: 400 });
  const updated = updateStatus(requestId, String(body.status), { sourceChain: body.sourceChain, sourceTx: body.sourceTx, destinationTx: body.destinationTx });
  if (!updated) return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
  return NextResponse.json({ data: updated });
}
