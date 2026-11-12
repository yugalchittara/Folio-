import { createRequest, listRequests, listWallets } from "@/lib/local-db";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export function GET() { return NextResponse.json({ data: listRequests() }); }

export async function POST(request: Request) {
  const body = await request.json();
  if (body.channel === "web") {
    if (body.productId !== "studio-mug-sand") return NextResponse.json({ error: "This product is unavailable." }, { status: 400 });
    const wallet = listWallets().find((item) => item.network === "Base Sepolia" && item.role === "Receiving");
    if (!wallet) return NextResponse.json({ error: "Add a Base Sepolia receiving wallet in the Business Console before taking online payments." }, { status: 503 });
    const id = `WEB-${randomUUID().slice(0, 8).toUpperCase()}`;
    const created = createRequest({ id, business_name: "Nook Goods", reference_id: id, description: "Studio mug · matte sand", amount: "2.00", settlement_asset: "USDC", settlement_chain: "Base", channel: "web", merchant_wallet_id: wallet.id });
    return NextResponse.json({ data: created }, { status: 201 });
  }
  if (!body.id || !body.amount) return NextResponse.json({ error: "id and amount are required" }, { status: 400 });
  const created = createRequest({
    id: String(body.id), business_name: String(body.businessName ?? "Nook Goods"), reference_id: String(body.referenceId ?? body.id),
    description: String(body.description ?? "POS payment"), amount: String(body.amount), settlement_asset: String(body.settlementAsset ?? "USDC"), settlement_chain: String(body.settlementChain ?? "Base"),
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
