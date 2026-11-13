import { createBankAccount, listBankAccounts } from "@/lib/data-store";
import { connection, NextResponse } from "next/server";

export async function GET() {
  await connection();
  return NextResponse.json({ data: await listBankAccounts() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const nickname = String(body.nickname ?? "").trim();
  const bankName = String(body.bankName ?? "").trim();
  const lastFour = String(body.accountLastFour ?? "").trim();
  const country = String(body.country ?? "").trim().toUpperCase();
  const currency = String(body.currency ?? "").trim().toUpperCase();
  if (!nickname || !bankName || !/^\d{4}$/.test(lastFour) || !/^[A-Z]{2}$/.test(country) || !["USD", "EUR", "GBP"].includes(currency)) {
    return NextResponse.json({ error: "Add a nickname, bank name, country code, currency, and the account's last four digits." }, { status: 400 });
  }
  return NextResponse.json({ data: await createBankAccount({ nickname, bank_name: bankName, account_last_four: lastFour, country, currency }) }, { status: 201 });
}
