export const tidepoolAssetForNetwork = (network: string) => ({
  "NEAR Testnet": "nep141:usdc.tidepool-sandbox.testnet",
  "Ethereum Sepolia": "nep141:eth-0x2e6ad9e6d59bb4585ea0e6762c3b637dde29dad2.tp-omft.testnet",
  "Arbitrum Sepolia": "nep141:arb-0x38d81431b9f76d9699af7517040d5221d9dea252.tp-omft.testnet",
  "Base Sepolia": "nep141:base-0x38d81431b9f76d9699af7517040d5221d9dea252.tp-omft.testnet",
}[network] ?? null);

export const tidepoolBaseUrl = () => process.env.ONECLICK_BASE_URL ?? "https://www.usetidepool.tech";

export const tidepoolHeaders = () => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.ONECLICK_JWT) headers.Authorization = `Bearer ${process.env.ONECLICK_JWT}`;
  return headers;
};
