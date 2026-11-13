import { createWallet, deleteWallet, listWallets } from "@/lib/data-store";
import { connection, NextResponse } from "next/server";

const serviceError = (error: unknown) => NextResponse.json(
  { error: error instanceof Error ? error.message : "The Folio data service could not save this wallet." },
  { status: 503 },
);

export async function GET() {
  try {
    await connection();
    return NextResponse.json({ data: await listWallets() });
  } catch (error) {
    return serviceError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.label || !body.address || !body.network || !body.role) return NextResponse.json({ error: "label, address, network, and role are required" }, { status: 400 });
    if (!["Receiving", "Operations"].includes(String(body.role))) return NextResponse.json({ error: "role must be Receiving or Operations" }, { status: 400 });
    return NextResponse.json({ data: await createWallet({ label: String(body.label), address: String(body.address), network: String(body.network), role: String(body.role), note: String(body.note ?? "") }) }, { status: 201 });
  } catch (error) {
    return serviceError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "wallet id is required" }, { status: 400 });
    const removed = await deleteWallet(id);
    if (!removed) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    return NextResponse.json({ data: removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove wallet.";
    const status = message.includes("used by") ? 409 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
