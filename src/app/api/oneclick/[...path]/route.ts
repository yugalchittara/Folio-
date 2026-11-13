import { connection, NextResponse } from "next/server";

const allowed = new Set(["v0/tokens", "v0/quote", "v0/status", "v0/deposit/submit"]);

async function forward(request: Request, path: string[]) {
  const route = path.join("/");
  if (!allowed.has(route)) return NextResponse.json({ error: "Unsupported 1Click operation" }, { status: 404 });
  const token = process.env.ONECLICK_JWT;
  // Quotes and status polling already use Tidepool as their fallback. Deposit submission
  // must use the same route provider or a payment can be sent without ever being tracked.
  const base = process.env.ONECLICK_BASE_URL ?? "https://www.usetidepool.tech";
  const isTidepool = new URL(base).hostname === "www.usetidepool.tech";
  if (!token && !isTidepool) return NextResponse.json({ error: "ONECLICK_JWT is not configured. A live transaction cannot start until partner credentials are supplied." }, { status: 503 });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const upstream = await fetch(`${base}/${route}${new URL(request.url).search}`, { method: request.method, headers, body: request.method === "GET" ? undefined : await request.text(), cache: "no-store" });
  return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" } });
}

export async function GET(request: Request, { params }: RouteContext<"/api/oneclick/[...path]">) { await connection(); const { path } = await params; return forward(request, path); }
export async function POST(request: Request, { params }: RouteContext<"/api/oneclick/[...path]">) { const { path } = await params; return forward(request, path); }
