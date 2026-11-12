# Folio

**Folio is a business money console for accepting digital-asset payments, tracking their lifecycle, and using settled balances for business operations.**

The demo shows one connected payment system for a merchant or business:

- accept a payment at a physical POS terminal or an online storefront;
- let a buyer choose a wallet and pay from a supported source network;
- route the payment through the NEAR Intents-compatible Tidepool flow;
- record wallet screening, payment progress, transaction references, and reconciliation data in the business console; and
- prepare supplier, team, and bank-payout operations from the resulting business balance.

> **Demo notice:** This project is designed for testnet and hackathon demonstration. It is not a custody product, money transmitter, or live fiat off-ramp. Circle CPN and KYT are represented in the product flow, but require provider onboarding and server-side integrations before real use.

## Product surfaces

All interfaces are part of one Next.js application and one shared API layer.

| Route | Interface | Purpose |
| --- | --- | --- |
| `/` | Folio website | Product website and integration positioning |
| `/console` | Business console | Merchant wallets, payment requests, operations, transactions, reconciliation, contacts, and integrations |
| `/pos` | POS terminal | Cashier creates an order, selects payment method, and shows a crypto QR checkout when selected |
| `/shop` | Nook Goods storefront | Example online merchant checkout with card, bank, and crypto method selection |
| `/pay/[requestId]` | Buyer checkout | Buyer selects a supported route and wallet, completes wallet screening, and approves the exact payment |

The POS and storefront create a payment request. Both then direct the buyer to the same hosted checkout at `/pay/[requestId]`.

## How the payment demo works

```text
POS or online storefront
  → creates a Folio payment request
  → buyer opens hosted checkout
  → buyer connects a wallet and selects a supported route
  → demo KYT screening records a decision
  → Tidepool quote and deposit workflow executes
  → payment status is persisted
  → POS/storefront and business console receive the updated outcome
```

When Tidepool returns transaction references, Folio shows the source payment, NEAR transaction, and destination transaction links in the buyer receipt, POS receipt, transactions view, and reconciliation view.

## What is live versus illustrative

| Capability | Current implementation |
| --- | --- |
| Payment requests, POS sessions, checkout state, wallets, contacts, operations, and reconciliation | Persisted locally in SQLite for the demo |
| Tidepool quote, deposit submission, and status polling | Server-side integration using the configured Tidepool / 1Click-compatible endpoint |
| Buyer wallet interaction | Browser wallet flow for supported EVM testnet routes |
| KYT / sanctions screening | Demo policy and audit record; replace with TRM, Chainalysis, or Elliptic before production |
| Circle CPN bank payout | Product flow and saved payout instruction only; no Circle API call or fiat movement occurs |
| Merchant authentication and multi-tenancy | Not yet implemented; this demo is intended for a controlled environment |

## Local setup

### Prerequisites

- Node.js 20 or newer
- npm
- SQLite command-line binary available at `/usr/bin/sqlite3` (the local demo ledger uses it)
- A browser wallet and test funds only if running the live payment demonstration

### Install and run

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Verify production build

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The project uses the verified webpack production build command configured in `package.json`.

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

| Variable | Purpose |
| --- | --- |
| `ONECLICK_BASE_URL` | Tidepool or 1Click-compatible API base URL |
| `ONECLICK_JWT` | Optional server-side partner credential; never expose this to the browser |
| `TIDEPOOL_MERCHANT_BASE_SEPOLIA_ADDRESS` | Fallback merchant receiving address for the demo route |
| `NEXT_PUBLIC_CHECKOUT_ORIGIN` | Public application origin used in POS QR codes, for example a Vercel deployment URL |
| `BASE_SEPOLIA_RPC_URL` / `ARBITRUM_SEPOLIA_RPC_URL` | Optional RPC overrides for balance reads |
| `COMPLIANCE_PROVIDER` | Demo KYT provider mode; replace with a real provider adapter before launch |
| `CIRCLE_CPN_*` | Reserved for future Circle CPN sandbox integration |
| `DATABASE_URL` | Reserved for the production Postgres migration |
| `WEBHOOK_SIGNING_SECRET` | Reserved for future signed webhook verification |

## Demonstrating the end-to-end flow

1. Open `/console` and add a receiving wallet if one has not already been saved.
2. Use `/pos` to enter an invoice/reference and dollar amount, then select **Crypto wallet**; or use `/shop` and choose crypto during checkout.
3. Scan the POS QR code or continue from the storefront to the hosted buyer checkout.
4. Select the available source route and connect the buyer wallet.
5. Complete the wallet-screening step and approve the exact transaction in the wallet.
6. Wait for the Tidepool status to complete. The POS and buyer receipt show the payment reference and available on-chain links.
7. Return to `/console` to inspect the payment in Transactions and Reconciliation.

## Architecture

```text
Next.js application
├── Folio website                  /
├── Business console               /console
├── POS terminal                   /pos
├── E-commerce storefront          /shop
├── Hosted buyer checkout          /pay/[requestId]
└── API routes                     /api/*
    ├── payment requests and lifecycle state
    ├── wallets, contacts, operations, and integrations
    ├── reconciliation records
    └── server-side Tidepool / 1Click proxy
```

The current local persistence adapter is [`src/lib/local-db.ts`](src/lib/local-db.ts). It stores demo data in `data/settlement-router.db`, which is intentionally ignored by Git.

## Deployment notes

Deploy this as **one Vercel project**, not separate projects. The website, console, POS, storefront, hosted checkout, and API routes share application state and should use one origin.

For a durable deployment, replace the local SQLite adapter with managed Postgres before enabling real users. Vercel Functions do not provide persistent writable application storage. Configure production credentials in Vercel Environment Variables—not in the repository—and set `NEXT_PUBLIC_CHECKOUT_ORIGIN` to the deployed public URL.

## Repository safety

The repository intentionally ignores:

- `.env.local` and other local environment files;
- the local SQLite ledger and journal files under `data/`;
- `node_modules`, `.next`, logs, and local Vercel project state.

The committed `.env.example` lists configuration names only and contains no values.

## Hackathon context

Folio is submitted as a **Real-World Money** concept: merchant payments, payment links, reconciliation, and business operations powered by cross-chain intent settlement.

Before submitting, keep this repository public, include a working demo or reproducible local instructions, and describe exactly which parts are testnet, demo-only, or provider-dependent.

## License

[MIT](LICENSE)
