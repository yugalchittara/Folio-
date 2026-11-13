"use client";

import { ArrowLeftIcon, ArrowRightIcon, ArrowSquareOutIcon, BankIcon, CheckCircleIcon, CircleNotchIcon, CopyIcon, CreditCardIcon, CurrencyCircleDollarIcon, QrCodeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

type PaymentMethod = "crypto" | "card" | "cash";
type Step = "sale" | "method";
type Wallet = { id: string; label: string; address: string; network: string; role: string };
type Integration = { id: string; name: string; type: "pos_sdk" | "online_checkout"; merchant_name: string; merchant_wallet_id: string | null };
const checkoutUrl = (requestId: string) => `${process.env.NEXT_PUBLIC_CHECKOUT_ORIGIN?.replace(/\/$/, "") ?? window.location.origin}/pay/${requestId}`;

export default function PosPage() {
  const [step, setStep] = useState<Step>("sale");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("checkout_ready");
  const [nearTx, setNearTx] = useState<string | null>(null);
  const [sourceTx, setSourceTx] = useState<string | null>(null);
  const [destinationTx, setDestinationTx] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [offlineMethod, setOfflineMethod] = useState<Exclude<PaymentMethod, "crypto"> | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [integrationId, setIntegrationId] = useState("");
  const numericAmount = Number(amount);
  const validSale = Boolean(reference.trim()) && Number.isFinite(numericAmount) && numericAmount > 0;
  const displayAmount = validSale ? numericAmount.toFixed(2) : "—";
  const integration = integrations.find((item) => item.id === integrationId) ?? integrations[0];
  const receivingWallet = wallets.find((item) => item.id === integration?.merchant_wallet_id);

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/integrations", { cache: "no-store" }), fetch("/api/wallets", { cache: "no-store" })])
      .then(async ([integrationResponse, walletResponse]) => [await integrationResponse.json(), await walletResponse.json()] as const)
      .then(([integrationJson, walletJson]) => {
        if (!active) return;
        const posIntegrations = (integrationJson.data ?? []).filter((item: Integration) => item.type === "pos_sdk" && item.merchant_name && item.merchant_wallet_id);
        setIntegrations(posIntegrations); setWallets(walletJson.data ?? []);
        if (posIntegrations[0]) setIntegrationId(posIntegrations[0].id);
      })
      .catch(() => { if (active) setError("Could not load the POS merchant configuration."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!requestId) return;
    const refreshSettlement = async () => {
      const response = await fetch(`/api/requests/${requestId}`);
      const json = await response.json();
      const status = String(json.data?.status ?? "checkout_ready");
      setPaymentStatus(status);
      setNearTx(json.data?.near_tx ?? null);
      setSourceTx(json.data?.source_tx ?? null);
      setDestinationTx(json.data?.destination_tx ?? null);
      if (status.toUpperCase() === "SUCCESS") setPaid(true);
    };
    void refreshSettlement();
    const interval = window.setInterval(() => { void refreshSettlement(); }, 2000);
    return () => window.clearInterval(interval);
  }, [requestId]);

  useEffect(() => {
    if (!requestId) return;
    let current = true;
    void QRCode.toDataURL(checkoutUrl(requestId), { width: 320, margin: 1, color: { dark: "#203021", light: "#ffffff" } })
      .then((url) => { if (current) setQrCode(url); })
      .catch(() => { if (current) setError("Unable to create the checkout QR code."); });
    return () => { current = false; };
  }, [requestId]);

  const createCryptoCheckout = async () => {
    if (!validSale) return;
    setPending(true); setError("");
    const id = `POS-${Date.now().toString().slice(-6)}`;
    try {
      if (!integration || !receivingWallet) throw new Error("Set up a POS integration and receiving wallet in Folio before taking a crypto payment.");
      const response = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, integrationId: integration.id, businessName: integration.merchant_name, merchantWalletId: receivingWallet.id, referenceId: reference.trim(), description: `Counter 02 · ${reference.trim()}`, amount: numericAmount.toFixed(2), settlementAsset: "USDC" }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setRequestId(json.data.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create payment request."); }
    finally { setPending(false); }
  };

  const startNextSale = () => { setStep("sale"); setRequestId(null); setReference(""); setAmount(""); setPaid(false); setPaymentStatus("checkout_ready"); setNearTx(null); setSourceTx(null); setDestinationTx(null); setError(""); setQrCode(""); setOfflineMethod(null); };
  const screenReference = requestId || reference || "NEW";

  return <main className="min-h-[100dvh] bg-[#eef3ea] p-3 text-[#172219] sm:p-7">
    <div className="mx-auto min-h-[calc(100dvh-1.5rem)] max-w-[430px] overflow-hidden rounded-[28px] border border-[#d5ded2] bg-[#fbfcf9] shadow-[0_25px_60px_-30px_rgba(28,46,28,.25)] sm:min-h-[760px]">
      <header className="flex items-center justify-between border-b border-[#e3e9df] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#203021] text-sm font-bold text-[#e4ff9c]">{(integration?.merchant_name ?? "NG").slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{integration?.merchant_name ?? "Set up POS"}</p><p className="text-[11px] text-[#718071]">Counter 02 · Cashier mode</p></div></div>
        <span className="font-mono text-[11px] text-[#718071]">{screenReference}</span>
      </header>
      {integrations.length > 1 && <div className="border-b border-[#e3e9df] bg-[#f5f8f2] px-5 py-2"><label className="flex items-center justify-between gap-3 text-[11px] font-semibold text-[#657264]"><span>POS merchant</span><select value={integration?.id ?? ""} onChange={(event) => setIntegrationId(event.target.value)} className="max-w-[230px] truncate bg-transparent text-right text-[11px] font-semibold outline-none"><option value="" disabled>Select integration</option>{integrations.map((item) => <option key={item.id} value={item.id}>{item.merchant_name || item.name}</option>)}</select></label></div>}
      <div className="p-5 sm:p-6">
        {paid ? <SuccessScreen amount={displayAmount} reference={reference} paymentId={requestId ?? "—"} nearTx={nearTx} sourceTx={sourceTx} destinationTx={destinationTx} onNext={startNextSale} /> : requestId ? <QrScreen amount={displayAmount} reference={reference} requestId={requestId} qrCode={qrCode} error={error} paymentStatus={paymentStatus} receivingNetwork={receivingWallet?.network ?? "Business wallet"} /> : step === "sale" ? <SaleStep amount={amount} reference={reference} validSale={validSale} onAmount={setAmount} onReference={setReference} onContinue={() => { setError(""); setStep("method"); }} /> : <MethodStep amount={displayAmount} reference={reference} pending={pending} offlineMethod={offlineMethod} error={error} onBack={() => setStep("sale")} onMethod={(method) => { if (method === "crypto") void createCryptoCheckout(); else setOfflineMethod(method); }} />}
      </div>
    </div>
  </main>;
}

function SaleStep({ reference, amount, validSale, onReference, onAmount, onContinue }: { reference: string; amount: string; validSale: boolean; onReference: (value: string) => void; onAmount: (value: string) => void; onContinue: () => void }) {
  return <section className="animate-in"><p className="eyebrow">New sale · 1 of 2</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.055em]">Enter the sale.</h1><p className="mt-2 text-sm leading-6 text-[#657264]">Add the receipt ID and dollar total before choosing how the customer pays.</p><div className="mt-8 space-y-5"><label className="block"><span className="text-sm font-semibold">Invoice or receipt ID</span><input autoFocus value={reference} onChange={(event) => onReference(event.target.value)} placeholder="Example: NG-1044" className="mt-2 w-full rounded-xl border border-[#d7e1d3] bg-white px-3 py-3.5 text-base outline-none transition focus:border-[#8abb47] focus:ring-4 focus:ring-[#dfff88]/30" /><span className="mt-2 block text-xs text-[#718071]">This appears on the customer receipt and in activity.</span></label><label className="block"><span className="text-sm font-semibold">Sale total</span><div className="mt-2 flex overflow-hidden rounded-xl border border-[#d7e1d3] bg-white focus-within:border-[#8abb47] focus-within:ring-4 focus-within:ring-[#dfff88]/30"><span className="grid place-items-center border-r border-[#d7e1d3] px-4 text-lg font-semibold text-[#61705f]">$</span><input inputMode="decimal" value={amount} onChange={(event) => onAmount(event.target.value)} placeholder="0.00" className="min-w-0 flex-1 px-3 py-3.5 text-lg font-medium outline-none" /></div><span className="mt-2 block text-xs text-[#718071]">Crypto checkout uses the same dollar value as an exact USDC amount in this test demo.</span></label></div><button disabled={!validSale} onClick={onContinue} className="buyer-action mt-9 w-full disabled:cursor-not-allowed disabled:opacity-45">Continue to payment method <ArrowRightIcon size={17} weight="bold" /></button></section>;
}

function MethodStep({ amount, reference, pending, offlineMethod, error, onBack, onMethod }: { amount: string; reference: string; pending: boolean; offlineMethod: Exclude<PaymentMethod, "crypto"> | null; error: string; onBack: () => void; onMethod: (method: PaymentMethod) => void }) {
  return <section className="animate-in"><button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-[#56742e] underline underline-offset-4"><ArrowLeftIcon size={15} weight="bold" />Edit sale</button><p className="eyebrow mt-6">Payment method · 2 of 2</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.055em]">How is the customer paying?</h1><div className="mt-6 flex items-center justify-between rounded-2xl border border-[#dce5d8] bg-white px-4 py-3"><div><p className="text-xs text-[#718071]">{reference}</p><p className="mt-1 text-sm font-semibold">Amount due</p></div><p className="text-xl font-semibold tracking-[-.04em]">${amount}</p></div><div className="mt-5 grid gap-3"><MethodButton icon={<CreditCardIcon size={21} weight="duotone" />} label="Card" description="Tap, chip or contactless" onClick={() => onMethod("card")} /><MethodButton icon={<BankIcon size={21} weight="duotone" />} label="Cash" description="Record payment at the register" onClick={() => onMethod("cash")} /><MethodButton icon={<CurrencyCircleDollarIcon size={21} weight="duotone" />} label={pending ? "Creating secure checkout…" : "Pay by crypto"} description="QR checkout · NEAR testnet intent swap" onClick={() => onMethod("crypto")} disabled={pending} accent /></div>{offlineMethod && <div className="mt-5 rounded-2xl border border-[#dce5d8] bg-[#f5f8f2] p-4 text-sm leading-6 text-[#61705f]">{offlineMethod === "card" ? "Continue on the connected card terminal." : "Accept the cash and mark the sale paid in the register."}</div>}{error && <p className="mt-4 text-sm text-[#a04b45]">{error}</p>}</section>;
}

function QrScreen({ amount, reference, requestId, qrCode, error, paymentStatus, receivingNetwork }: { amount: string; reference: string; requestId: string; qrCode: string; error: string; paymentStatus: string; receivingNetwork: string }) {
  const normalized = paymentStatus.toLowerCase();
  const verifying = normalized === "wallet_verification_in_progress";
  const verified = ["wallet_verified", "quote_ready", "deposit_submitted", "success"].includes(normalized);
  const paymentMoving = normalized === "deposit_submitted";
  const inProgress = verifying || verified;

  return <section className="animate-in text-center">
    <p className="eyebrow">{inProgress ? "Payment in progress" : "Crypto payment ready"}</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-[-.055em]">{inProgress ? "Following the payment." : "Ask the customer to scan."}</h1>
    <p className="mt-2 text-sm leading-6 text-[#657264]">{inProgress ? "We will confirm receipt automatically." : "Their wallet will show the exact amount before they approve."}</p>
    {!inProgress && <div className="mx-auto mt-7 grid size-52 place-items-center rounded-[24px] border border-[#dce5d8] bg-white p-4 shadow-[0_18px_38px_-28px_rgba(28,46,28,.36)]">{qrCode ? <img src={qrCode} alt={`QR code for payment ${requestId}`} className="size-full" /> : <QrCodeIcon size={52} className="animate-pulse text-[#41513f]" weight="duotone" />}</div>}
    {inProgress && <div className="mt-7 rounded-2xl border border-[#dce5d8] bg-white p-4 text-left"><p className="text-sm font-semibold">Transaction in progress</p><div className="mt-4 space-y-4"><ProgressStep complete={verified} active={verifying} title="Verify buyer wallet" detail={verifying ? "Screening the connected wallet" : "Wallet verified"} /><ProgressStep complete={false} active={paymentMoving || verified} title="Settle through NEAR" detail={paymentMoving ? "Confirming the intent swap and payout" : "Waiting for payment approval"} /></div></div>}
    <div className="mt-6 divide-y divide-[#e4ebe0] rounded-2xl border border-[#dce5d8] bg-white px-4 text-left text-sm"><div className="flex justify-between gap-4 py-3"><span className="text-[#718071]">Receipt</span><span className="font-mono text-xs">{reference}</span></div><div className="flex justify-between gap-4 py-3"><span className="text-[#718071]">Customer pays</span><span className="font-semibold">{amount} USDC</span></div><div className="flex justify-between gap-4 py-3"><span className="text-[#718071]">Merchant receives</span><span className="font-medium">{receivingNetwork}</span></div></div>
    {!inProgress && <><Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#456d24] underline underline-offset-4" href={`/pay/${requestId}`}><QrCodeIcon size={16} weight="bold" />Open checkout</Link><button onClick={() => navigator.clipboard.writeText(checkoutUrl(requestId))} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d7e1d3] bg-white px-3 py-3 text-xs font-semibold text-[#345031] transition hover:bg-[#f5f8f2] active:scale-[.98]"><CopyIcon size={15} weight="bold" />Copy checkout link</button></>}
    {error && <p className="mt-4 text-sm text-[#a04b45]">{error}</p>}
  </section>;
}

function ProgressStep({ complete, active, title, detail }: { complete: boolean; active: boolean; title: string; detail: string }) {
  return <div className="flex items-center gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-full ${complete ? "bg-[#d9ff80] text-[#365429]" : "bg-[#eff3ec] text-[#718071]"}`}>{complete ? <CheckCircleIcon size={19} weight="fill" /> : active ? <CircleNotchIcon size={18} className="animate-spin text-[#567d2e]" weight="bold" /> : <span className="size-2 rounded-full bg-current" />}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-[#718071]">{detail}</p></div></div>;
}

function SuccessScreen({ amount, reference, paymentId, nearTx, sourceTx, destinationTx, onNext }: { amount: string; reference: string; paymentId: string; nearTx: string | null; sourceTx: string | null; destinationTx: string | null; onNext: () => void }) {
  return <section className="animate-in py-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#d9ff80] text-[#34531e]"><CheckCircleIcon size={30} weight="fill" /></span><p className="eyebrow mt-6">Payment confirmed</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.06em]">Funds received.</h1><p className="mt-3 text-sm leading-6 text-[#657264]">{amount} USDC has settled to the business wallet.</p>{nearTx && <a href={`https://testnet.nearblocks.io/txns/${nearTx}`} target="_blank" rel="noreferrer" className="mt-7 flex items-center justify-between rounded-2xl border border-[#a9d775] bg-[#f1ffdf] p-4 text-left text-[#274421]"><span><span className="block text-[11px] font-semibold uppercase tracking-[.12em]">NEAR testnet · intent swap</span><span className="mt-1 block text-sm font-semibold">View confirmed swap</span></span><ArrowSquareOutIcon size={19} weight="bold" /></a>}<div className="mt-5 divide-y divide-[#e4ebe0] rounded-2xl border border-[#dce5d8] bg-white px-4 text-left text-sm"><div className="flex justify-between gap-4 py-3"><span className="text-[#718071]">Receipt reference</span><span className="font-mono text-xs">{reference}</span></div><div className="flex justify-between gap-4 py-3"><span className="text-[#718071]">Payment ID</span><span className="font-mono text-xs">{paymentId}</span></div></div>{(sourceTx || destinationTx) && <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[#456d24]">{sourceTx && <a href={`https://sepolia.etherscan.io/tx/${sourceTx}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">Buyer payment</a>}{destinationTx && <a href={`https://sepolia.basescan.org/tx/${destinationTx}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">Base Sepolia payout</a>}</div>}<p className="mt-4 text-xs text-[#718071]">These references are available in Business Console activity and reconciliation.</p><button onClick={onNext} className="buyer-action mt-8">Start next sale</button></section>;
}

function MethodButton({ icon, label, description, onClick, disabled = false, accent = false }: { icon: React.ReactNode; label: string; description: string; onClick: () => void; disabled?: boolean; accent?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${accent ? "border-[#a7ce5a] bg-[#f4ffdf] hover:bg-[#ecffd0]" : "border-[#dce5d8] bg-white hover:border-[#bed69d] hover:bg-[#fbfdf8]"}`}><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${accent ? "bg-[#d9ff80] text-[#304b20]" : "bg-[#eef3eb] text-[#536850]"}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-[#718071]">{description}</span></span><ArrowRightIcon size={18} weight="bold" className="text-[#7b9272]" /></button>;
}
