import BuyerCheckout from "./buyer-checkout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Secure checkout · Nook Goods" };

export const instant = false;

export default async function PaymentPage({ params }: PageProps<"/pay/[requestId]">) {
  const { requestId } = await params;
  return <BuyerCheckout requestId={requestId} />;
}
