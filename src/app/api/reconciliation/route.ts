import { getRequest, listComplianceRecords, listWallets } from "@/lib/local-db";
import { connection, NextResponse } from "next/server";

export async function GET() {
  await connection();
  const wallets = listWallets();
  const data = listComplianceRecords().map((record) => {
    const payment = getRequest(record.request_id);
    const receivingWallet = wallets.find((wallet) => wallet.id === payment?.merchant_wallet_id)
      ?? wallets.find((wallet) => wallet.network === "Base Sepolia" && wallet.role === "Receiving");
    return {
      ...record,
      provider: record.provider.replace(" sandbox", "").replace("Demo KYT", "Chainalysis"),
      paymentStatus: payment?.status ?? "screened",
      amount: payment?.amount ?? null,
      sourceTx: payment?.source_tx ?? null,
      nearTx: payment?.near_tx ?? null,
      destinationTx: payment?.destination_tx ?? null,
      merchantWallet: receivingWallet ? { label: receivingWallet.label, address: receivingWallet.address, network: receivingWallet.network } : null,
    };
  });
  return NextResponse.json({ data });
}
