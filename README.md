This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Operations demo

The Business Console's **Operations** tab has two deliberately different paths:

- **Pay someone** sends the exact entered USDC amount on Base Sepolia or Arbitrum Sepolia. Save a business wallet, select it as the source, enter a same-network recipient, review, and approve the ERC-20 transfer in Rabby. Rabby must control the selected source address and have testnet USDC plus native gas. The operation is marked confirmed only after the app verifies the transaction and successful receipt through the testnet RPC. The transaction link and status also appear in Activity.
- **Move to bank (Circle CPN)** preselects a fictional Example Bank destination ending in 4826. The business may also save a masked destination (nickname, bank name, country, currency and last four digits), select it, and prepare a payout request. The request is persisted with an **awaiting bank connection** status. This is a genuine local workflow record, but it does not call Circle, debit USDC, or send fiat. Do not enter a full account number. Older demo simulation records remain labelled as legacy demos in Activity.

The current `.env.local` has no CPN credentials. A real CPN sandbox integration is a separate next step: Circle must enable the relevant CPN capability for the organization, and the sandbox API key and integration details must be provided. A generic Circle sandbox account alone does not establish access to CPN payouts. See Circle's [CPN onboarding and sandbox access](https://help.circle.com/support/en/cpn-onboarding-and-sandbox-access?id=kb_article_view&sysparm_article=KB0010987) and [API key guidance](https://help.circle.com/support/en/create-and-manage-api-keys?id=kb_article_view&sysparm_article=KB0010991).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
