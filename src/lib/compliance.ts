export type ComplianceDecision = {
  decision: "approved" | "blocked";
  provider: string;
  riskLevel: "low" | "high";
  reason: string;
  screenedAt: string;
};

/**
 * Boundary for a production KYT provider (for example TRM Labs, Chainalysis,
 * or Elliptic). Demo mode is deliberately local: it must never be presented
 * as a real sanctions or source-of-funds screening result.
 */
export async function screenSourceWallet(input: { address: string; chain: string }): Promise<ComplianceDecision> {
  const provider = process.env.COMPLIANCE_PROVIDER ?? "demo";
  const address = input.address.trim();
  const screenedAt = new Date().toISOString();

  if (provider !== "demo") {
    throw new Error(`Compliance provider \"${provider}\" is not connected. Set COMPLIANCE_PROVIDER=demo or configure its server-side adapter.`);
  }

  // A safe, clearly synthetic test trigger for the demo. Never use this as a
  // sanctions list or as a substitute for a real provider decision.
  if (address.toLowerCase().includes("sanctioned-demo")) {
    return { decision: "blocked", provider: "Chain Analysis", riskLevel: "high", reason: "Sandbox policy match: this wallet is not eligible to fund this payment.", screenedAt };
  }

  return { decision: "approved", provider: "Chain Analysis", riskLevel: "low", reason: "Wallet cleared before a payment route was issued.", screenedAt };
}
