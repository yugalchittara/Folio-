import { createOperation, listBankAccounts, listOperations, listWallets } from "@/lib/data-store";
import { getTestnet } from "@/lib/testnet-usdc";
import { connection, NextResponse } from "next/server";

export async function GET() {
  await connection();
  return NextResponse.json({ data: await listOperations() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const kind = String(body.kind ?? "");
  const isBank = kind === "fiat_offramp";
  if (!["supplier_payment", "team_payment", "fiat_offramp"].includes(kind)) return NextResponse.json({ error: "Choose a valid payment type." }, { status: 400 });
  const sourceWallet = (await listWallets()).find((wallet) => wallet.id === body.sourceWalletId);
  if (!sourceWallet) return NextResponse.json({ error: "Choose a saved business wallet." }, { status: 400 });
  const bankAccount = isBank ? (await listBankAccounts()).find((account) => account.id === body.bankAccountId) : null;
  if (isBank && !bankAccount) return NextResponse.json({ error: "Choose a saved bank account." }, { status: 400 });
  const recipient = isBank ? bankAccount!.nickname : String(body.recipient ?? "").trim();
  const recipientAddress = String(body.recipientAddress ?? "").trim();
  const network = isBank ? bankAccount!.currency : String(body.network ?? "").trim();
  const amountText = String(body.amount ?? "");
  const amount = Number(amountText);
  if (!recipient || !network || (!isBank && !recipientAddress) || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Add a recipient, destination, and an amount with up to two decimal places." }, { status: 400 });
  if (isBank ? !["USD", "EUR", "GBP"].includes(network) : !["Base Sepolia", "Arbitrum Sepolia", "NEAR Testnet"].includes(network)) return NextResponse.json({ error: "Choose a supported destination." }, { status: 400 });
  if (!isBank && body.intent === "send" && (!getTestnet(sourceWallet.network) || sourceWallet.network !== network || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress))) return NextResponse.json({ error: "Live payments require a valid EVM recipient on the same testnet as the source wallet." }, { status: 400 });
  const status = isBank ? "review_ready" : body.intent === "send" ? "awaiting_wallet_approval" : "draft";
  return NextResponse.json({ data: await createOperation({ kind, recipient, recipient_address: recipientAddress, network, reference: String(body.reference ?? "").trim(), source_wallet_id: sourceWallet.id, bank_account_id: bankAccount?.id ?? null, amount: amount.toFixed(2), asset: "USDC", status }) }, { status: 201 });
}
