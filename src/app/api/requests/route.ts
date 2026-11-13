import { createRequest, listIntegrations, listRequests, listWallets } from "@/lib/data-store";
import { connection, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export async function GET() { await connection(); return NextResponse.json({ data: await listRequests() }); }

export async function POST(request: Request) {
  const body = await request.json();
  const expectedType = body.channel === "web" ? "online_checkout" : "pos_sdk";
  const integrations = await listIntegrations();
  const integration = integrations.find((item) => item.id === body.integrationId && item.type === expectedType)
    ?? integrations.find((item) => item.type === expectedType);
  const requestedWalletId = integration?.merchant_wallet_id ?? body.merchantWalletId;
  const wallet = (await listWallets()).find((item) => item.id === requestedWalletId && item.role === "Receiving");
  if (!wallet) return NextResponse.json({ error: `Choose a receiving wallet for this ${expectedType === "pos_sdk" ? "POS" : "online checkout"} integration in Folio.` }, { status: 503 });
  const merchantName = integration?.merchant_name || String(body.businessName ?? "").trim() || "Nook Goods";

  if (body.channel === "web") {
    if (body.productId !== "studio-mug-sand") return NextResponse.json({ error: "This product is unavailable." }, { status: 400 });
    const id = `WEB-${randomUUID().slice(0, 8).toUpperCase()}`;
    const created = await createRequest({ id, business_name: merchantName, reference_id: id, description: "Studio mug · matte sand", amount: "2.00", settlement_asset: "USDC", settlement_chain: wallet.network, channel: "web", merchant_wallet_id: wallet.id });
    return NextResponse.json({ data: created }, { status: 201 });
  }
  if (!body.id || !body.amount) return NextResponse.json({ error: "id and amount are required" }, { status: 400 });
  const created = await createRequest({
    id: String(body.id), business_name: merchantName, reference_id: String(body.referenceId ?? body.id),
    description: String(body.description ?? "POS payment"), amount: String(body.amount), settlement_asset: String(body.settlementAsset ?? "USDC"), settlement_chain: wallet.network, channel: "pos", merchant_wallet_id: wallet.id,
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
