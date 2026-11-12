# External Dependencies & Access Checklist

Settlement Router is intentionally structured so provider calls stay server-side. Please provide access through private environment variables or a shared secret manager—not chat messages, source files, or `NEXT_PUBLIC_*` variables.

## Needed now: NEAR Intents / 1Click

1. A **1Click partner/API JWT** issued for the project, plus the confirmed production or hackathon endpoint. The app will use it only from a server-side proxy.
2. Confirmation of the **one exact demo route** to support: source chain, source asset, destination `USDC` on `Base`, and a test recipient wallet.
3. A funded **demo payer wallet** and its source-chain gas token. If ERC-20 approval is required, we will make it explicit in the checkout.
4. An approved **merchant Base wallet** to receive native USDC. Use a wallet controlled by the team and safe for a public demo.
5. A decision on the environment: mainnet for the live demonstration, or a compatible sandbox/test environment if available. We will not imply live settlement if using a sandbox.

The integration path is: token discovery → dry quote → committed quote → user deposit → optional deposit submission → status polling. 1Click’s public integration materials describe these endpoints and status stages, and recommend keeping the partner JWT server-side. [1Click API reference](https://github.com/defuse-protocol/gitbook-docs/blob/main/integration/distribution-channels/1click-api.md)

## Needed next: Circle CPN off-ramp

1. Circle account / organization with **CPN sandbox access enabled**.
2. Sandbox API credential and the confirmed API base URL for your program.
3. The Circle entity/program identifier required to create or monitor a payout/transfer.
4. A **test beneficiary** approved within the sandbox, including supported payout currency and country.
5. The webhook signing secret and a public HTTPS callback URL for payout lifecycle events.
6. Confirmation of the CPN-supported **settlement asset and chain** for the chosen payout corridor. Do not assume NEAR is a CPN settlement rail; the off-ramp adapter will accept the supported Circle flow as configured.

Circle’s documentation lists `BASE` as a USDC chain code and identifies the APIs as supporting selected chains; we will use Circle’s current sandbox documentation and your enabled program configuration as the source of truth for CPN operations. [Circle supported chains and currencies](https://developers.circle.com/circle-mint/supported-chains-and-currencies)

## Infrastructure needed before persistence/webhooks

1. **Postgres database** connection string (Neon, Supabase, Railway, or equivalent) for requests, quotes, attempts, receipts, and state transitions.
2. A deploy target with server-side environment variables and HTTPS (Vercel, Railway, Render, etc.).
3. A public webhook endpoint or tunnel for local integration testing. For production, use the deployed HTTPS endpoint only.
4. Domain/subdomain preference for hosted links, e.g. `pay.yourdomain.com`.

## What not to send

- Private keys, seed phrases, real bank-account information, personally identifiable beneficiary data, or KYC documents.
- Any production Circle or 1Click secret in this repository.

## First handoff format

When access is ready, add the approved values to a local `.env` copied from `.env.example`, then tell me which environment is enabled and which one demo route to target. I can then wire the NEAR quote/status adapter first, followed by the Circle CPN payout adapter.
