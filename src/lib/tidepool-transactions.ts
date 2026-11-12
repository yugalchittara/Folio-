type ExplorerEntry = { label?: string; url?: string; explorerUrl?: string };
type ChainTransaction = { txHash?: string; hash?: string; explorerUrl?: string };
type TidepoolStatus = {
  depositTxHash?: string;
  swapDetails?: {
    originChainTxHashes?: ChainTransaction[];
    nearTxHashes?: string[];
    destinationChainTxHashes?: ChainTransaction[];
  };
  tidepool?: { explorer?: ExplorerEntry[] };
};

const evmHash = /^0x[a-f\d]{64}$/i;
const nearHash = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;

function hashFromUrl(url?: string) {
  if (!url) return null;
  try { return new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? null; }
  catch { return null; }
}

export function extractTidepoolTransactions(payload: TidepoolStatus) {
  const explorers = payload.tidepool?.explorer ?? [];
  const nearExplorer = explorers.find((item) => /swap.*execute_intents/i.test(item.label ?? "") && /testnet\.nearblocks\.io/.test(item.url ?? item.explorerUrl ?? ""));
  const nearCandidate = hashFromUrl(nearExplorer?.url ?? nearExplorer?.explorerUrl);
  const nearTx = nearCandidate && nearHash.test(nearCandidate) ? nearCandidate : null;

  const originEntry = payload.swapDetails?.originChainTxHashes?.find((item) => /sepolia\.etherscan\.io/.test(item.explorerUrl ?? ""));
  const originCandidate = payload.depositTxHash ?? originEntry?.txHash ?? originEntry?.hash;
  const sourceTx = originCandidate && evmHash.test(originCandidate) ? originCandidate : null;

  const baseEntry = payload.swapDetails?.destinationChainTxHashes?.find((item) => /sepolia\.basescan\.org/.test(item.explorerUrl ?? ""));
  const baseExplorer = explorers.find((item) => /swap payout on Base Sepolia/i.test(item.label ?? ""));
  const baseCandidate = baseEntry?.txHash ?? baseEntry?.hash ?? hashFromUrl(baseExplorer?.url ?? baseExplorer?.explorerUrl);
  const destinationTx = baseCandidate && evmHash.test(baseCandidate) ? baseCandidate : null;
  return { sourceTx, nearTx, destinationTx };
}
