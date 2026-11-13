import { getOperation, listWallets, updateOperation } from "@/lib/local-db";
import { getTestnet, rpcCall, toBaseUnits, transferCalldata } from "@/lib/testnet-usdc";
import { connection, NextResponse } from "next/server";

type ChainTransaction = { from: string; to: string | null; input: string };
type ChainReceipt = { status: string };

export async function GET(_request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  await connection();
  const { operationId } = await params;
  let operation = getOperation(operationId);
  if (!operation) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (operation.status !== "submitted" || !operation.tx_hash) return NextResponse.json({ data: operation });

  const source = listWallets().find((wallet) => wallet.id === operation.source_wallet_id);
  const network = source && getTestnet(source.network);
  if (!source || !network || !operation.recipient_address) return NextResponse.json({ data: updateOperation(operationId, "verification_failed") });

  try {
    const transaction = await rpcCall<ChainTransaction | null>(network.rpc, "eth_getTransactionByHash", [operation.tx_hash]);
    if (!transaction) return NextResponse.json({ data: operation });
    const decimalsHex = await rpcCall<string>(network.rpc, "eth_call", [{ to: network.token, data: "0x313ce567" }, "latest"]);
    const decimals = Number(BigInt(decimalsHex));
    const expected = transferCalldata(operation.recipient_address, toBaseUnits(operation.amount, decimals));
    if (transaction.from.toLowerCase() !== source.address.toLowerCase() || transaction.to?.toLowerCase() !== network.token.toLowerCase() || transaction.input.toLowerCase() !== expected.toLowerCase()) {
      operation = updateOperation(operationId, "verification_failed")!;
      return NextResponse.json({ data: operation });
    }
    const receipt = await rpcCall<ChainReceipt | null>(network.rpc, "eth_getTransactionReceipt", [operation.tx_hash]);
    if (!receipt) return NextResponse.json({ data: operation });
    operation = updateOperation(operationId, receipt.status === "0x1" ? "confirmed" : "failed")!;
    return NextResponse.json({ data: operation });
  } catch {
    return NextResponse.json({ data: operation, warning: "Chain confirmation is temporarily unavailable." });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  const { operationId } = await params;
  const operation = getOperation(operationId);
  if (!operation) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (operation.status !== "awaiting_wallet_approval") return NextResponse.json({ error: "This payment cannot be changed now." }, { status: 409 });
  const body = await request.json();
  if (body.action === "cancel") return NextResponse.json({ data: updateOperation(operationId, "cancelled") });
  if (body.action !== "submit" || typeof body.txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(body.txHash)) return NextResponse.json({ error: "A valid testnet transaction hash is required." }, { status: 400 });
  return NextResponse.json({ data: updateOperation(operationId, "submitted", { txHash: body.txHash }) });
}
