import { createIntegration, listIntegrations, listWallets } from "@/lib/data-store";
import { connection, NextResponse } from "next/server";

export async function GET() {
  try {
    await connection();
    return NextResponse.json({ data: await listIntegrations() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The Folio data service could not load integrations." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = String(body.type ?? "");
    if (!body.name || !["online_checkout", "pos_sdk"].includes(type)) {
      return NextResponse.json({ error: "A name and valid integration type are required." }, { status: 400 });
    }
    const merchantName = String(body.merchantName ?? "").trim();
    const walletId = String(body.merchantWalletId ?? "").trim();
    if (!merchantName) return NextResponse.json({ error: "Add the merchant name shown to the buyer." }, { status: 400 });
    const wallet = (await listWallets()).find((item) => item.id === walletId && item.role === "Receiving");
    if (!wallet) return NextResponse.json({ error: "Choose a saved receiving wallet for this integration." }, { status: 400 });
    return NextResponse.json({ data: await createIntegration({ name: String(body.name), type: type as "online_checkout" | "pos_sdk", webhook_url: String(body.webhookUrl ?? ""), merchant_name: merchantName, merchant_wallet_id: wallet.id }) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The Folio data service could not create this integration." }, { status: 503 });
  }
}
