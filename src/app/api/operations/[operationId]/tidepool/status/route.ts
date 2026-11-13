import { addOperationEvent, getOperation, updateOperation } from "@/lib/data-store";
import { extractTidepoolTransactions } from "@/lib/tidepool-transactions";
import { tidepoolBaseUrl, tidepoolHeaders } from "@/lib/tidepool-assets";
import { connection, NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  await connection();
  const { operationId } = await params;
  const operation = await getOperation(operationId);
  if (!operation) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (!operation.deposit_address) return NextResponse.json({ error: "No intent route has been created for this payment." }, { status: 409 });

  const upstream = await fetch(`${tidepoolBaseUrl()}/v0/status?depositAddress=${encodeURIComponent(operation.deposit_address)}`, { headers: tidepoolHeaders(), cache: "no-store" });
  const payload = await upstream.json();
  if (!upstream.ok) return NextResponse.json({ error: payload.message ?? "Tidepool status is unavailable.", details: payload }, { status: upstream.status });

  const routeStatus = String(payload.status ?? payload.state ?? "PENDING_DEPOSIT").toUpperCase();
  const transactions = extractTidepoolTransactions(payload);
  const operationStatus = routeStatus === "SUCCESS" ? "confirmed" : ["FAILED", "REFUNDED"].includes(routeStatus) ? "failed" : "routing";
  const updated = (await updateOperation(operationId, operationStatus, { nearTx: transactions.nearTx ?? undefined, destinationTx: transactions.destinationTx ?? undefined, routeStatus }))!;
  await addOperationEvent(operationId, "tidepool.status", { routeStatus, ...transactions, depositAddress: operation.deposit_address });
  return NextResponse.json({ data: updated, route: payload });
}
