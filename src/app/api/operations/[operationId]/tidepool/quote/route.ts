import { addOperationEvent, getOperation, listWallets, updateOperation } from "@/lib/data-store";
import { tidepoolAssetForNetwork, tidepoolBaseUrl, tidepoolHeaders } from "@/lib/tidepool-assets";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  const { operationId } = await params;
  const operation = await getOperation(operationId);
  if (!operation) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (operation.status !== "awaiting_wallet_approval") return NextResponse.json({ error: "This payment cannot be routed now." }, { status: 409 });

  const sourceWallet = (await listWallets()).find((wallet) => wallet.id === operation.source_wallet_id);
  const originAsset = sourceWallet && tidepoolAssetForNetwork(sourceWallet.network);
  const destinationAsset = tidepoolAssetForNetwork(operation.network ?? "");
  if (!sourceWallet || !originAsset || !destinationAsset || !operation.recipient_address) {
    return NextResponse.json({ error: "Choose supported source and recipient testnet wallets." }, { status: 400 });
  }

  const deadline = new Date(Date.now() + 12 * 60 * 1000).toISOString();
  // A wallet-held NEP-141 balance should enter Tidepool through the verifier.
  // This is a single ft_transfer_call and avoids creating/registering a new
  // implicit token account for every quote.
  const depositType = sourceWallet.network === "NEAR Testnet" ? "INTENTS" : "ORIGIN_CHAIN";
  const quoteRequest = {
    dry: false,
    swapType: "EXACT_OUTPUT",
    slippageTolerance: 100,
    originAsset,
    depositType,
    destinationAsset,
    amount: Math.round(Number(operation.amount) * 1_000_000).toString(),
    refundTo: sourceWallet.address,
    refundType: "ORIGIN_CHAIN",
    recipient: operation.recipient_address,
    recipientType: "DESTINATION_CHAIN",
    deadline,
  };
  const upstream = await fetch(`${tidepoolBaseUrl()}/v0/quote`, { method: "POST", headers: tidepoolHeaders(), body: JSON.stringify(quoteRequest), cache: "no-store" });
  const payload = await upstream.json();
  if (!upstream.ok) return NextResponse.json({ error: payload.message ?? "Tidepool could not create an intent quote.", details: payload }, { status: upstream.status });

  await updateOperation(operationId, "awaiting_wallet_approval", { depositAddress: payload.quote?.depositAddress, routeStatus: "QUOTE_READY", providerReference: payload.correlationId });
  await addOperationEvent(operationId, "tidepool.quote_ready", { correlationId: payload.correlationId, depositAddress: payload.quote?.depositAddress, amountIn: payload.quote?.amountIn, amountInFormatted: payload.quote?.amountInFormatted, amountOutFormatted: payload.quote?.amountOutFormatted, originNetwork: sourceWallet.network, destinationNetwork: operation.network, depositType, deadline: payload.quote?.deadline ?? deadline });
  return NextResponse.json({ data: payload });
}
