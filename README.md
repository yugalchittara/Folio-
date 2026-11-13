# Folio — Global business finance, onchain

**Folio is an operating layer for businesses that need to accept stablecoin payments, manage onchain balances, pay suppliers and teams across chains, and prepare fiat payouts—without making each business operate chain by chain.**

[Live demo](https://folio-amber-delta.vercel.app) · [Business Console](https://folio-amber-delta.vercel.app/console) · [POS](https://folio-amber-delta.vercel.app/pos) · [Merchant storefront](https://folio-amber-delta.vercel.app/shop)

> Built for the **Real-World Money** track. Folio is a testnet prototype, not a custody product, money transmitter, or live fiat off-ramp.

## The problem

Stablecoins can move globally, but a business still has to stitch together a checkout, wallet selection, transaction monitoring, reconciliation, supplier payouts, and off-ramp operations. Each additional chain adds another integration and another operational blind spot.

**Our thesis:** stablecoin acceptance is more valuable when a business can use what it receives. Conversion and operational work can erode that value when suppliers, teams, or bank payouts need another asset or rail. Folio therefore connects checkout to balances, cross-chain expenses, and a future fiat payout path. This framing aligns with the [IMF's analysis of integration and conversion costs](https://www.elibrary.imf.org/view/journals/087/2026/021/article-A001-en.xml) and [Visa's account of business payment uses](https://corporate.visa.com/en/sites/visa-perspectives/press-releases/stablecoins-gain-traction-business-payments.html).

Folio makes the business operate from one place while customers and payees use the assets and networks available to them.

## A quick reviewer path

Open the [Nook Goods storefront](https://folio-amber-delta.vercel.app/shop) or [POS terminal](https://folio-amber-delta.vercel.app/pos), choose a crypto payment, and follow the hosted checkout through wallet approval and the NEAR Intents settlement timeline. Then open the [Business Console](https://folio-amber-delta.vercel.app/console) to find that payment in Transactions and Reconciliation and inspect the corresponding KYT-style record. The Operations tab shows how the merchant initiates a supplier or team payout from a selected business wallet.

## What reviewers can experience

Folio is deliberately built as a connected product—not a single happy-path swap screen.

1. **Accept** — Create a payment request from a payment link, the Nook Goods web store, or a POS terminal. Each entry point lands in the same hosted checkout and shared ledger.
2. **Screen** — Before an onchain route is opened, Folio creates a KYT-style source-wallet screening record and exposes it later in reconciliation. This is a product control and audit trail, not a claim of production compliance coverage.
3. **Route** — The buyer chooses a supported wallet and testnet route. Folio creates a live Tidepool / NEAR Intents-compatible quote server-side, opens the wallet for the exact payment, and tracks source, NEAR, and destination references.
4. **Operate** — In the Business Console, the merchant sees incoming payments, live balances, daily volume, transaction history, and reconciliation records. The same console creates cross-chain supplier or team payouts with a NEAR Intents route.
5. **Off-ramp workflow** — The console also models a Circle CPN bank-payout instruction so a business can move from onchain collections to a traditional bank destination. The CPN leg is intentionally illustrative until a Circle sandbox/production integration and approved beneficiary are available.

### One merchant, multiple checkout channels

The merchant configures an online store and a POS terminal as separate integrations, assigning a merchant name and receiving wallet to each. The storefront and POS each create a payment request tagged with their integration, then send the customer to the same hosted checkout. A payment link can use that hosted flow too. The resulting payment and screening history is visible in one Business Console, with its channel and receiving wallet preserved for reconciliation.

This is a working merchant journey across Folio's demo surfaces. A standalone widget or SDK for an arbitrary third-party site is a future packaging step; the current integration surface is the hosted checkout and payment-request API.

### One payment, end to end

For example, a Nook Goods customer selects crypto for a 2 USDC order. Folio creates a request, records a demo source-wallet screening decision before issuing a live Tidepool quote, and asks the buyer's browser wallet to approve the quoted transfer. The checkout tracks the source transaction, NEAR Intents routing, and merchant payout. Only a successful provider status marks the payment settled; the same result then appears in the buyer receipt and the merchant's transaction and reconciliation views.

Two recorded testnet checkout examples are [an online order](https://folio-amber-delta.vercel.app/pay/WEB-D6AD9606) ([source transaction](https://sepolia.etherscan.io/tx/0x09dcce8ffbb0a98b3ef37b73ae5ca7a3db59ce8b3c3f73a9e5e9ec440332ecd8), [NEAR transaction](https://testnet.nearblocks.io/txns/3yVBynW64w9UizWY3ZCB2K2MxanqeMa7JszSBA4WNKR4)) and [a POS sale](https://folio-amber-delta.vercel.app/pay/POS-628392) ([source transaction](https://sepolia.etherscan.io/tx/0x0fef5c3857997a334165ee289d344e05d8152ce56f6a80d880f0a3334e9bc793), [NEAR transaction](https://testnet.nearblocks.io/txns/J3oCdbhePXnAnvpnMGDXeqHxMUHg6Tvskjf98KdCtrCT)). These references are recorded by the demo's payment ledger; a fresh payment requires a funded testnet wallet.

### From collections to business expenses

The receiving wallet's balance becomes available to the merchant's operations workflow. A merchant can select that NEAR Testnet wallet, a saved supplier or team contact, and a supported destination network such as Base Sepolia. Folio requests a destination-specific intent quote, asks the NEAR wallet to fund it, and follows the route toward the recipient. The console keeps the payment reference, recipient, source wallet, and route status together. This closes the operational loop between accepting revenue and paying expenses without requiring the merchant to perform each bridge manually.

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
