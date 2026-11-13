# Folio — Global business finance, onchain

**Folio is an operating layer for businesses that need to accept stablecoin payments, manage onchain balances, pay suppliers and teams across chains, and prepare fiat payouts—without making each business operate chain by chain.**

[Live demo](https://folio-amber-delta.vercel.app) · [Business Console](https://folio-amber-delta.vercel.app/console) · [POS](https://folio-amber-delta.vercel.app/pos) · [Merchant storefront](https://folio-amber-delta.vercel.app/shop)

> Built for the **Real-World Money** track. Folio is a testnet prototype, not a custody product, money transmitter, or live fiat off-ramp.

## The problem

Stablecoins can move globally, but a business still has to stitch together a checkout, wallet selection, transaction monitoring, reconciliation, supplier payouts, and off-ramp operations. Each additional chain adds another integration and another operational blind spot.

Folio makes the business operate from one place while customers and payees use the assets and networks available to them.

## What reviewers can experience

Folio is deliberately built as a connected product—not a single happy-path swap screen.

1. **Accept** — Create a payment request from a payment link, the Nook Goods web store, or a POS terminal. Each entry point lands in the same hosted checkout and shared ledger.
2. **Screen** — Before an onchain route is opened, Folio creates a KYT-style source-wallet screening record and exposes it later in reconciliation. This is a product control and audit trail, not a claim of production compliance coverage.
3. **Route** — The buyer chooses a supported wallet and testnet route. Folio creates a live Tidepool / NEAR Intents-compatible quote server-side, opens the wallet for the exact payment, and tracks source, NEAR, and destination references.
4. **Operate** — In the Business Console, the merchant sees incoming payments, live balances, daily volume, transaction history, and reconciliation records. The same console creates cross-chain supplier or team payouts with a NEAR Intents route.
5. **Off-ramp workflow** — The console also models a Circle CPN bank-payout instruction so a business can move from onchain collections to a traditional bank destination. The CPN leg is intentionally illustrative until a Circle sandbox/production integration and approved beneficiary are available.

## Why NEAR Intents

Folio uses intent-based routing as the abstraction boundary between a business operation and the chains involved in fulfilling it.

For a NEAR-origin business payout, Folio requests an `INTENTS` deposit quote, then uses the connected NEAR wallet to call `ft_transfer_call` into the Tidepool verifier with the quote’s single-use deposit address. Tidepool tracks the deposit and routes the requested outcome to the recipient chain. For EVM-origin checkout routes, Folio opens the customer’s installed wallet for the exact ERC-20 transfer to the quote-specific deposit address.

The business sees a clear operational outcome—collect funds, pay a recipient, reconcile a result—rather than a sequence of manual bridges and chain-specific steps.

## Product surfaces

| Route | Surface | What it demonstrates |
| --- | --- | --- |
| `/` | Folio website | Product positioning, checkout flow, operations model, integrations, and industries |
| `/console` | Business Console | Wallets, payment requests, balances, transactions, reconciliation, contacts, integrations, and payouts |
| `/pos` | POS terminal | Cashier creates a sale, selects crypto checkout, and presents a hosted payment QR |
| `/shop` | Nook Goods storefront | Online checkout with a realistic payment-method choice |
| `/pay/[requestId]` | Hosted buyer checkout | Wallet screening, live quote, wallet approval, settlement progress, and receipt |

## Architecture

```text
POS / payment link / e-commerce checkout
              │
              ▼
       Hosted Folio checkout
       ├─ KYT-style wallet-screening audit record
       ├─ Tidepool quote + deposit submission + status polling
       └─ buyer wallet approval for the exact route
              │
              ▼
     NEAR Intents-compatible settlement
              │
              ▼
 Business Console ──► supplier/team payouts ──► destination chain
       │
       └───────────► reconciliation + bank-payout instruction (Circle CPN workflow)
```

All surfaces use one Next.js app and a shared API/persistence layer, so POS, web checkout, buyer receipt, and console report the same payment lifecycle.

## What is live, testnet, and illustrative

| Capability | Status |
| --- | --- |
| Payment requests, POS sessions, wallets, contacts, operations, transaction history, and reconciliation | Persisted demo data |
| Tidepool quote generation, deposit submission, and status polling | **Live testnet integration** through a server-side Tidepool / 1Click-compatible API |
| EVM checkout wallet interaction | **Live testnet** browser-wallet flow for supported EVM routes |
| NEAR payout wallet interaction | **Live testnet** NEAR Wallet Selector + Meteor Wallet flow using `ft_transfer_call` into the verifier |
| Route status, source transaction, NEAR transaction, and destination transaction references | Persisted and displayed when returned by the provider |
| KYT / sanctions screening | Policy-driven demo control and audit record; production requires a provider such as Chainalysis, TRM, or Elliptic |
| KYC / merchant onboarding | Product boundary only; not implemented |
| Circle CPN bank payout | Product workflow and saved instruction only; no Circle API call or fiat movement |

## Quick start

### Prerequisites

- Node.js 20+
- npm
- SQLite CLI at `/usr/bin/sqlite3` for the local demo ledger
- A funded browser wallet and testnet USDC only when running the live payment paths

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Verify

```bash
npm run lint
npx tsc --noEmit
```

## Demonstration path

1. Open `/console` and review the merchant’s wallets, integrations, and transaction activity.
2. Use `/pos` to enter a receipt ID and amount, choose **Crypto wallet**, then scan the checkout QR; or open `/shop` and select the crypto payment method.
3. In the hosted checkout, select a supported source route and approve the exact quote in the wallet.
4. Follow the settlement timeline from source transfer through NEAR Intents routing to merchant payout.
5. Return to `/console` to inspect the payment volume, transaction detail, KYT-style audit record, and reconciliation.
6. In **Operations**, create a supplier or team payout. Select a NEAR source wallet to demonstrate the intent deposit flow, or choose an EVM source wallet for the equivalent EVM approval path.

## Configuration

Copy `.env.example` to `.env.local`. Never commit secrets.

| Variable | Purpose |
| --- | --- |
| `ONECLICK_BASE_URL` | Tidepool or 1Click-compatible API base URL |
| `ONECLICK_JWT` | Optional server-side partner credential; never exposed to the browser |
| `TIDEPOOL_MERCHANT_BASE_SEPOLIA_ADDRESS` | Fallback merchant receiving address for the demo route |
| `NEXT_PUBLIC_CHECKOUT_ORIGIN` | Public application origin used in POS QR codes |
| `BASE_SEPOLIA_RPC_URL` / `ARBITRUM_SEPOLIA_RPC_URL` | Optional RPC overrides for balance reads |
| `COMPLIANCE_PROVIDER` | Demo KYT mode; replace with a real provider adapter before launch |
| `CIRCLE_CPN_*` | Reserved for Circle CPN sandbox / production credentials |

## Production boundaries

Before handling production value, Folio needs managed persistent storage, tenant isolation, role-based access control, signed webhooks, a real KYT/KYC provider, provider onboarding, verified recipient controls, risk limits, and appropriate regulatory/compliance design. Vercel Functions do not provide durable writable application storage; replace the demo adapter with managed Postgres before real-user deployment.

See [LIVE_INTEGRATION_STATUS.md](LIVE_INTEGRATION_STATUS.md) for implementation-level integration notes and [EXTERNAL_DEPENDENCIES.md](EXTERNAL_DEPENDENCIES.md) for third-party boundaries.

## License

[MIT](LICENSE)
