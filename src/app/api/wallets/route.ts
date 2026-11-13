import { createWallet, listWallets } from "@/lib/data-store";
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
