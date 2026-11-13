import { addEvent, getRequest, listWallets, updateStatus } from "@/lib/data-store";
import { screenSourceWallet } from "@/lib/compliance";
import { tidepoolAssetForNetwork } from "@/lib/tidepool-assets";
import { NextResponse } from "next/server";

const tidepoolBase = process.env.ONECLICK_BASE_URL ?? "https://www.usetidepool.tech";
const supportedOrigins = new Set([
  "nep141:eth-0x2e6ad9e6d59bb4585ea0e6762c3b637dde29dad2.tp-omft.testnet",
  "nep141:arb-0x38d81431b9f76d9699af7517040d5221d9dea252.tp-omft.testnet",
  "nep141:base-0x38d81431b9f76d9699af7517040d5221d9dea252.tp-omft.testnet",
  "nep141:usdc.tidepool-sandbox.testnet",
]);

export async function POST(request: Request, { params }: RouteContext<"/api/requests/[requestId]/tidepool/quote">) {
  const { requestId } = await params;
  const payment = await getRequest(requestId);
  if (!payment) return NextResponse.json({ error: "Payment request not found" }, { status: 404 });

  const businessWallet = (await listWallets()).find((wallet) => payment.merchant_wallet_id ? wallet.id === payment.merchant_wallet_id : wallet.network === "Base Sepolia" && wallet.role === "Receiving");
  const merchantRecipient = businessWallet?.address;
  const destinationAsset = businessWallet ? tidepoolAssetForNetwork(businessWallet.network) : null;
  if (!merchantRecipient || !destinationAsset) return NextResponse.json({ error: "Choose a supported receiving wallet in Folio before creating a live quote." }, { status: 503 });

  const body = await request.json();
  if (!supportedOrigins.has(body.originAsset) || typeof body.refundTo !== "string" || !body.refundTo.trim()) {
    return NextResponse.json({ error: "Choose a supported source asset and enter the source wallet used for refunds." }, { status: 400 });
  }

  let compliance;
  try {
    compliance = await screenSourceWallet({ address: body.refundTo, chain: String(body.sourceChain ?? "Source chain") });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Compliance screening is unavailable." }, { status: 503 });
  }
  await addEvent(requestId, "compliance.source_wallet_screened", { address: body.refundTo.trim(), chain: body.sourceChain, ...compliance });
  if (compliance.decision === "blocked") {
    await updateStatus(requestId, "wallet_check_failed", { sourceChain: body.sourceChain });
    return NextResponse.json({ error: "This wallet cannot be used for this payment.", compliance }, { status: 403 });
  }

  await updateStatus(requestId, "wallet_verified", { sourceChain: body.sourceChain });

  const amount = Math.round(Number(payment.amount) * 1_000_000).toString();
  const deadline = new Date(Date.now() + 12 * 60 * 1000).toISOString();
  const quoteRequest = {
    dry: false,
    swapType: payment.channel === "web" ? "EXACT_OUTPUT" : "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset: body.originAsset,
    depositType: "ORIGIN_CHAIN",
    destinationAsset,
    amount,
    refundTo: body.refundTo.trim(),
    refundType: "ORIGIN_CHAIN",
    recipient: merchantRecipient,
    recipientType: "DESTINATION_CHAIN",
    deadline,
  };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.ONECLICK_JWT) headers.Authorization = `Bearer ${process.env.ONECLICK_JWT}`;

  const upstream = await fetch(`${tidepoolBase}/v0/quote`, { method: "POST", headers, body: JSON.stringify(quoteRequest), cache: "no-store" });
  const payload = await upstream.json();
  if (!upstream.ok) return NextResponse.json({ error: payload.message ?? "Tidepool could not create a quote.", details: payload }, { status: upstream.status });

  await updateStatus(requestId, "quote_ready", { sourceChain: body.sourceChain });
  await addEvent(requestId, "tidepool.quote_ready", { correlationId: payload.correlationId, originAsset: body.originAsset, depositAddress: payload.quote?.depositAddress, amountIn: payload.quote?.amountIn, amountInFormatted: payload.quote?.amountInFormatted, deadline: payload.quote?.deadline ?? deadline, merchantRecipient, merchantWalletLabel: businessWallet?.label ?? "Environment fallback" });
  return NextResponse.json({ data: payload, compliance });
}
