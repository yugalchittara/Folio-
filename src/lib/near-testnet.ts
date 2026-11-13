import { NEAR_TESTNET_RPC, NEAR_TESTNET_USDC_CONTRACT } from "@/lib/near-assets";
import { formatBaseUnits } from "@/lib/testnet-usdc";

async function nearRpc<T>(method: string, params: unknown): Promise<T> {
  const response = await fetch(NEAR_TESTNET_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "folio", method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("NEAR Testnet RPC did not respond.");
  const payload = await response.json() as { result?: T; error?: { message?: string } };
  if (payload.error || payload.result === undefined) throw new Error(payload.error?.message ?? "NEAR Testnet RPC returned no result.");
  return payload.result;
}

export async function nearTestnetUsdcBalance(accountId: string) {
  const argsBase64 = Buffer.from(JSON.stringify({ account_id: accountId })).toString("base64");
  const result = await nearRpc<{ result: number[] }>("query", {
    request_type: "call_function",
    finality: "final",
    account_id: NEAR_TESTNET_USDC_CONTRACT,
    method_name: "ft_balance_of",
    args_base64: argsBase64,
  });
  const rawBalance = Buffer.from(result.result).toString("utf8");
  const balance = JSON.parse(rawBalance) as string;
  return formatBaseUnits(BigInt(balance), 6);
}
