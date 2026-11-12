# Live Integration Status

## Working locally now

- SQLite ledger at `data/settlement-router.db`, created automatically on first API request.
- `POST /api/requests` creates a persisted business/POS payment request.
- `GET /api/requests/:id` supplies the buyer checkout with persisted amount, recipient outcome, and event history.
- `POST /api/requests/:id/status` persists payment lifecycle updates and an append-only event record.
- The POS creates a real local request; the buyer checkout reads that exact record and writes its progression back to the ledger.

## Live NEAR Intents plumbing included

`/api/oneclick/[...path]` is a server-only proxy for token discovery, quote, status, and deposit submission. It supports production 1Click with `ONECLICK_JWT`, and Tidepool with `ONECLICK_BASE_URL=https://www.usetidepool.tech`. Tidepool is 1Click-compatible on NEAR testnet and needs no API key; a configured JWT is still forwarded when one is present. The secret is never sent to the browser.

The buyer checkout now creates a live Tidepool quote server-side, presents its one-time deposit address and exact amount, submits the buyer's deposit transaction hash, polls live status, persists lifecycle events, and links to the Base Sepolia destination transaction when Tidepool reports it. The POS polls the local ledger and moves to its receipt state only after a final Tidepool `SUCCESS` status.

## Still blocked from a real onchain test transaction

1. **Merchant Base Sepolia receiving address.** Add it as `TIDEPOOL_MERCHANT_BASE_SEPOLIA_ADDRESS` in `.env.local`. The app sends every test quote to that server-side address.
2. **Funded buyer source wallet** plus native gas on the selected testnet. Claim test USDC from Tidepool's faucet, then use the wallet to make the exact deposit shown in checkout. The first implementation accepts the resulting transaction hash; it does not include an embedded wallet connector.
3. **Circle CPN sandbox access** and an approved test beneficiary before a fiat payout can be initiated or shown as completed.

No payment or explorer outcome is fabricated: a receipt only appears after Tidepool's live status is `SUCCESS`.
