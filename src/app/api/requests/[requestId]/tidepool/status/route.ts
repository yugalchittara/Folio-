import { addEvent, getRequest, updateStatus } from "@/lib/data-store";
import { extractTidepoolTransactions } from "@/lib/tidepool-transactions";
import { connection, NextResponse } from "next/server";

const tidepoolBase = process.env.ONECLICK_BASE_URL ?? "https://www.usetidepool.tech";

export async function GET(request: Request, { params }: RouteContext<"/api/requests/[requestId]/tidepool/status">) {
  await connection();
  const { requestId } = await params;
  if (!(await getRequest(requestId))) return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
  const depositAddress = new URL(request.url).searchParams.get("depositAddress");
  if (!depositAddress) return NextResponse.json({ error: "depositAddress is required" }, { status: 400 });

  const headers: Record<string, string> = {};
  if (process.env.ONECLICK_JWT) headers.Authorization = `Bearer ${process.env.ONECLICK_JWT}`;
  const upstream = await fetch(`${tidepoolBase}/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`, { headers, cache: "no-store" });
  const payload = await upstream.json();
  if (!upstream.ok) return NextResponse.json({ error: payload.message ?? "Tidepool status is unavailable.", details: payload }, { status: upstream.status });

  const status = payload.status ?? payload.state ?? "pending_deposit";
  const transactions = extractTidepoolTransactions(payload);
  await updateStatus(requestId, String(status).toLowerCase(), {
    sourceTx: transactions.sourceTx ?? undefined,
    nearTx: transactions.nearTx ?? undefined,
    destinationTx: transactions.destinationTx ?? undefined,
  });
  await addEvent(requestId, "tidepool.status", { status, ...transactions, depositAddress });
  return NextResponse.json({ data: payload });
}
