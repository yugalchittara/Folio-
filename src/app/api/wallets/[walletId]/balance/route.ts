import { listWallets } from "@/lib/data-store";
import { nearTestnetUsdcBalance } from "@/lib/near-testnet";
import { formatBaseUnits, getTestnet, rpcCall } from "@/lib/testnet-usdc";
import { connection, NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ walletId: string }> }) {
  await connection();
  const { walletId } = await params;
  const wallet = (await listWallets()).find((item) => item.id === walletId);
  if (!wallet) return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  if (wallet.network === "NEAR Testnet") {
    if (!/^[a-z0-9._-]+\.testnet$/i.test(wallet.address)) return NextResponse.json({ error: "This wallet does not have a valid NEAR Testnet account ID." }, { status: 422 });
    try {
      const balance = await nearTestnetUsdcBalance(wallet.address);
      return NextResponse.json({
        data: {
          walletId,
          balance,
          asset: "USDC",
          network: wallet.network,
          tokenAddress: "usdc.tidepool-sandbox.testnet",
          chainId: "near:testnet",
          decimals: 6,
          explorerUrl: `https://testnet.nearblocks.io/address/${wallet.address}`,
          refreshedAt: new Date().toISOString(),
        },
      }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ error: "Could not read the USDC balance from NEAR Testnet. Try refreshing." }, { status: 503 });
    }
  }
  const network = getTestnet(wallet.network);
  if (!network) return NextResponse.json({ error: "Live USDC balance is not available for this network yet." }, { status: 422 });
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet.address)) return NextResponse.json({ error: "This wallet does not have a valid EVM address." }, { status: 422 });

  try {
    const [rawBalance, decimals] = await Promise.all([
      rpcCall<string>(network.rpc, "eth_call", [{ to: network.token, data: `0x70a08231${wallet.address.slice(2).toLowerCase().padStart(64, "0")}` }, "latest"]),
      rpcCall<string>(network.rpc, "eth_call", [{ to: network.token, data: "0x313ce567" }, "latest"]),
    ]);
    const precision = Number(BigInt(decimals));
    if (!Number.isInteger(precision) || precision < 0 || precision > 18) throw new Error("Token precision was unavailable.");
    return NextResponse.json({
      data: {
        walletId,
        balance: formatBaseUnits(BigInt(rawBalance), precision),
        asset: "USDC",
        network: wallet.network,
        tokenAddress: network.token,
        chainId: network.chainId,
        decimals: precision,
        explorerUrl: `${network.explorer}/address/${wallet.address}`,
        refreshedAt: new Date().toISOString(),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not read the USDC balance from this network. Try refreshing." }, { status: 503 });
  }
}
