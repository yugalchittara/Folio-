import { createContact, listContacts } from "@/lib/data-store";
import { connection, NextResponse } from "next/server";

export async function GET() { await connection(); return NextResponse.json({ data: await listContacts() }); }

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name || !body.type || !body.destination || !body.network) return NextResponse.json({ error: "name, type, destination, and network are required" }, { status: 400 });
  return NextResponse.json({ data: await createContact({ name: String(body.name), type: String(body.type), destination: String(body.destination), network: String(body.network), email: String(body.email ?? "") }) }, { status: 201 });
}
