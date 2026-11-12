export type TestnetNetwork = "Base Sepolia" | "Arbitrum Sepolia";

export function getTestnet(network: string) {
  if (network === "Base Sepolia") return {
    rpc: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    token: "0x38d81431b9f76d9699af7517040d5221d9dea252",
    chainId: "0x14a34",
    explorer: "https://sepolia.basescan.org",
  };
  if (network === "Arbitrum Sepolia") return {
    rpc: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    token: "0x38d81431b9f76d9699af7517040d5221d9dea252",
    chainId: "0x66eee",
    explorer: "https://sepolia.arbiscan.io",
  };
  return null;
}

export async function rpcCall<T>(rpc: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Testnet RPC did not respond.");
  const payload = await response.json() as { result?: T; error?: { message?: string } };
  if (payload.error || payload.result === undefined) throw new Error(payload.error?.message ?? "Testnet RPC returned no result.");
  return payload.result;
}

export function toBaseUnits(amount: string, decimals: number) {
  const [whole, fraction = ""] = amount.split(".");
  if (!/^(?:0|[1-9]\d*)$/.test(whole) || !/^\d*$/.test(fraction) || fraction.length > decimals) throw new Error("Invalid token amount.");
  return BigInt(whole) * (BigInt(10) ** BigInt(decimals)) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

export function formatBaseUnits(value: bigint, decimals: number) {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = (value % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function transferCalldata(recipient: string, rawAmount: bigint) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) throw new Error("Enter a valid recipient wallet address.");
  return `0xa9059cbb${recipient.slice(2).toLowerCase().padStart(64, "0")}${rawAmount.toString(16).padStart(64, "0")}`;
}
