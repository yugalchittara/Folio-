import { getOperation, updateOperation } from "@/lib/data-store";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  const { operationId } = await params;
  const operation = await getOperation(operationId);
  if (!operation) return NextResponse.json({ error: "Payout request not found." }, { status: 404 });
  if (operation.kind !== "fiat_offramp" || operation.status !== "review_ready") return NextResponse.json({ error: "This payout request cannot be prepared now." }, { status: 409 });
  const updated = await updateOperation(operationId, "awaiting_bank_connection", { providerReference: `PAYOUT-${operationId.slice(3).toUpperCase()}` });
  return NextResponse.json({ data: updated });
}
