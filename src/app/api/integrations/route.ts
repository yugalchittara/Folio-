import { createIntegration, listIntegrations } from "@/lib/data-store";
import { connection, NextResponse } from "next/server";

export async function GET() {
  await connection();
  return NextResponse.json({ data: await listIntegrations() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const type = String(body.type ?? "");
  if (!body.name || !["online_checkout", "pos_sdk"].includes(type)) {
    return NextResponse.json({ error: "A name and valid integration type are required." }, { status: 400 });
  }
  return NextResponse.json({ data: await createIntegration({ name: String(body.name), type: type as "online_checkout" | "pos_sdk", webhook_url: String(body.webhookUrl ?? "") }) }, { status: 201 });
}
