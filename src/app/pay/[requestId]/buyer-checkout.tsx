"use client";

import { ArrowLeftIcon, ArrowSquareOutIcon, CheckCircleIcon, CircleNotchIcon, CopyIcon, ShieldCheckIcon, WalletIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useState } from "react";

type Payment = { id: string; business_name: string; reference_id: string; description: string; amount: string; settlement_asset: string; settlement_chain: string; status: string; channel: string | null; source_chain: string | null; source_tx: string | null; near_tx: string | null; destination_tx: string | null };
type PaymentEvent = { type: string; payload: string | Record<string, unknown> };
type Stage = "review" | "wallet" | "routing" | "receipt";
type Quote = { correlationId: string; quote: { depositAddress: string; amountIn: string; amountInFormatted?: string } };
type Compliance = { provider: string; reason: string };
type Source = { label: string; chain: string; assetId: string; token: string; chainId?: string };
type WalletChoice = "Rabby" | "MetaMask" | "Browser wallet";
type VerificationState = "idle" | "checking" | "passed";
type InjectedProvider = { isRabby?: boolean; isMetaMask?: boolean; request: (request: { method: string; params?: unknown[] }) => Promise<unknown> };

declare global { interface Window { ethereum?: InjectedProvider & { providers?: InjectedProvider[] } } }

const sources: Source[] = [
  { label: "Ethereum Sepolia", chain: "Ethereum Sepolia", token: "USDC", chainId: "0xaa36a7", assetId: "nep141:eth-0x2e6ad9e6d59bb4585ea0e6762c3b637dde29dad2.tp-omft.testnet" },
  { label: "Arbitrum Sepolia", chain: "Arbitrum Sepolia", token: "USDC", chainId: "0x66eee", assetId: "nep141:arb-0x38d81431b9f76d9699af7517040d5221d9dea252.tp-omft.testnet" },
  { label: "Base Sepolia", chain: "Base Sepolia", token: "USDC", chainId: "0x14a34", assetId: "nep141:base-0x38d81431b9f76d9699af7517040d5221d9dea252.tp-omft.testnet" },
  { label: "NEAR Testnet", chain: "NEAR Testnet", token: "USDC", assetId: "nep141:usdc.tidepool-sandbox.testnet" },
];

const walletOptions: Array<{ name: WalletChoice; logo?: string }> = [
  { name: "Rabby", logo: "/wallets/rabby-logo.png" },
  { name: "MetaMask", logo: "/wallets/metamask.svg" },
  { name: "Browser wallet" },
];

export default function BuyerCheckout({ requestId, embedded = false }: { requestId: string; embedded?: boolean }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [stage, setStage] = useState<Stage>("review");
  const [source, setSource] = useState(sources[0]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [refundTo, setRefundTo] = useState("");
  const [walletChoice, setWalletChoice] = useState<WalletChoice>("Rabby");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [depositTx, setDepositTx] = useState("");
  const [routeStatus, setRouteStatus] = useState("Waiting for payment");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>("idle");

  const selectedProvider = () => {
    const candidates = window.ethereum?.providers ?? (window.ethereum ? [window.ethereum] : []);
    return candidates.find((item) => walletChoice === "Rabby" ? item.isRabby : walletChoice === "MetaMask" ? item.isMetaMask && !item.isRabby : true);
  };

  const reloadPayment = async () => {
    const response = await fetch(`/api/requests/${requestId}`);
    const json = await response.json();
    if (json.data) setPayment(json.data);
  };

  useEffect(() => {
    let current = true;
    void fetch(`/api/requests/${requestId}`)
      .then((response) => response.json())
      .then((json) => {
        if (!current || !json.data) return;
        const savedPayment = json.data as Payment;
        const status = String(savedPayment.status ?? "awaiting_payment").toLowerCase();
        const savedQuote = quoteFromEvents(json.events ?? []);
        setPayment(savedPayment);
        setSource(sources.find((item) => item.chain === savedPayment.source_chain) ?? sources[0]);
        if (savedQuote) setQuote(savedQuote);
        if (savedPayment.source_tx) setDepositTx(savedPayment.source_tx);
        setRouteStatus(status.replaceAll("_", " "));
        if (status === "success") {
          setStage("receipt");
        } else if (savedQuote && ["deposit_submitted", "pending_deposit", "processing", "in_progress", "pending_swap", "swapping"].includes(status)) {
          // A reopened checkout must resume the existing Intent route, not start over.
          setStage("routing");
        }
      })
      .catch(() => { if (current) setError("We could not load this payment."); });
    return () => { current = false; };
  }, [requestId]);

  const createQuote = async (walletAddress = refundTo) => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/requests/${requestId}/tidepool/quote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ originAsset: source.assetId, sourceChain: source.chain, refundTo: walletAddress }) });
      const json = await response.json();
      if (json.compliance) setCompliance(json.compliance);
      if (!response.ok) throw new Error(json.error ?? "Unable to prepare this payment.");
      setQuote(json.data); await reloadPayment(); return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to prepare this payment."); return false; }
    finally { setBusy(false); }
  };

  const connectAndScreenWallet = async () => {
    setError("");
    if (!source.chainId) { setError("NEAR Testnet needs a NEAR wallet hand-off. Choose an EVM testnet wallet for this demo."); return; }
    const provider = selectedProvider();
    if (!provider) { setError(`${walletChoice} was not found. Install or unlock it, then try again.`); return; }
    setBusy(true);
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: source.chainId }] });
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      const walletAddress = accounts[0];
      if (!walletAddress) throw new Error("No wallet account was selected.");
      setRefundTo(walletAddress);
      await provider.request({ method: "personal_sign", params: [`Verify wallet ownership for payment ${requestId}. This signature does not move funds.`, walletAddress] });
      await fetch(`/api/requests/${requestId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "wallet_verification_in_progress", sourceChain: source.chain }) });
      setVerificationState("checking");
      const verified = await createQuote(walletAddress);
      if (!verified) { setVerificationState("idle"); return; }
      setVerificationState("passed");
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      setVerificationState("idle");
      setStage("wallet");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to connect this wallet."); }
    finally { setBusy(false); }
  };

  const approvePaymentInWallet = async () => {
    if (!quote || !refundTo || !source.chainId) return setError("Connect the wallet you will pay from before approving this payment.");
    const provider = selectedProvider();
    const tokenAddress = source.assetId.match(/0x[a-fA-F0-9]{40}/)?.[0];
    const depositAddress = quote.quote.depositAddress;
    if (!provider || !tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(depositAddress)) { setError("This payment route cannot be opened in the selected wallet."); return; }
    setBusy(true); setError("");
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: source.chainId }] });
      const amount = BigInt(quote.quote.amountIn).toString(16).padStart(64, "0");
      const recipient = depositAddress.slice(2).padStart(64, "0");
      const data = `0xa9059cbb${recipient}${amount}`;
      const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from: refundTo, to: tokenAddress, data }] }) as string;
      setDepositTx(txHash);
      const response = await fetch("/api/oneclick/v0/deposit/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ txHash, depositAddress }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message ?? json.error ?? "Your transfer was sent, but we could not start tracking it yet.");
      await fetch(`/api/requests/${requestId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "deposit_submitted", sourceChain: source.chain, sourceTx: txHash }) });
      setStage("routing"); await checkStatus();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The wallet did not approve this payment."); }
    finally { setBusy(false); }
  };

  const checkStatus = async () => {
    if (!quote) return;
    const response = await fetch(`/api/requests/${requestId}/tidepool/status?depositAddress=${encodeURIComponent(quote.quote.depositAddress)}`);
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Unable to refresh payment status.");
    const status = String(json.data.status ?? json.data.state ?? "PENDING_DEPOSIT");
    setRouteStatus(status.replaceAll("_", " "));
    await reloadPayment();
    if (status === "SUCCESS") {
      // Keep the completed intent route visible briefly before handing off to the receipt.
      window.setTimeout(() => setStage("receipt"), 1500);
    }
  };

  const submitDeposit = async () => {
    if (!quote || !depositTx.trim()) return setError("Paste the transaction hash after your wallet confirms the transfer.");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/oneclick/v0/deposit/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ txHash: depositTx.trim(), depositAddress: quote.quote.depositAddress }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message ?? json.error ?? "We could not verify that payment.");
      await fetch(`/api/requests/${requestId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "deposit_submitted", sourceChain: source.chain, sourceTx: depositTx.trim() }) });
      setStage("routing"); await checkStatus();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to submit the payment."); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (stage !== "routing" || !quote) return;
    const interval = window.setInterval(() => { checkStatus().catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to refresh payment status.")); }, 5000);
    return () => window.clearInterval(interval);
  }, [stage, quote]);

  const copy = async (value: string) => { await navigator.clipboard.writeText(value); };
  const Root = embedded ? "div" : "main";
  if (!payment && !error) return <Root className="grid min-h-40 place-items-center text-sm text-[#657265]">Opening secure checkout…</Root>;
  if (!payment) return <Root className="grid min-h-40 place-items-center p-6 text-center text-sm text-[#a04b45]">{error || "Payment not found."}</Root>;
  const isWeb = payment.channel === "web";

  return <Root className={embedded ? "w-full text-[#152016]" : isWeb ? "min-h-[100dvh] bg-[#F7F5EF] px-4 py-7 text-[#152016] sm:py-12" : "min-h-[100dvh] bg-[#eef3ea] px-4 py-5 text-[#152016] sm:px-7 sm:py-9"}>{isWeb && !embedded && <div className="mx-auto mb-5 max-w-[560px]"><a href="/shop" className="inline-flex items-center gap-2 text-xs font-semibold text-[#456d24]"><ArrowLeftIcon size={15} weight="bold" />Back to Nook Goods</a></div>}<div className={embedded ? "relative w-full" : isWeb ? "relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[24px] border border-[#d7e1d3] bg-[#fbfcf9] shadow-[0_20px_55px_-30px_rgba(37,54,33,.18)]" : "relative mx-auto max-w-md overflow-hidden rounded-[30px] border border-[#d7e1d3] bg-[#fbfcf9] shadow-[0_20px_55px_-30px_rgba(37,54,33,.38)]"}>{!embedded && <header className="flex items-center justify-between border-b border-[#e3eae0] px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#deff8c] text-xs font-bold">{payment.business_name === "Nook Goods" ? <Image src="/nook-goods-mark.svg" alt="" width={24} height={24} className="size-6" /> : "SR"}</span><div><p className="text-sm font-semibold">{payment.business_name}</p><p className="text-[11px] text-[#758174]">Secure payment checkout</p></div></div><span className="font-mono text-[11px] text-[#728071]">{payment.id}</span></header>}
    <div className={embedded ? "" : "p-5 sm:p-6"}>
      {stage === "receipt" ? <Receipt payment={payment} source={source.label} routeStatus={routeStatus} /> : <>
        {!embedded && <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#6f7d6e]">Complete payment</p><h1 className="mt-2 text-[28px] font-semibold leading-[1.05] tracking-[-.05em]">Pay {payment.amount} {payment.settlement_asset}</h1><p className="mt-2 text-sm text-[#6d796d]">{payment.description}</p></div><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#edf5e7] text-[#456d24]"><ShieldCheckIcon size={20} weight="fill" /></span></div>}
        {stage === "review" && <section className={embedded ? "mt-5" : "mt-7"}>
          <div className="rounded-2xl border border-[#dce4d8] bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-[#728071]">Pay from</p><p className="mt-1 text-sm font-semibold">{source.token} · {source.label}</p></div><button onClick={() => setSourcesOpen(!sourcesOpen)} className="text-xs font-semibold text-[#456d24] underline underline-offset-4">Change</button></div>{sourcesOpen && <div className="mt-4 grid gap-2 border-t border-[#edf0ea] pt-4">{sources.map((item) => <button key={item.assetId} onClick={() => { setSource(item); setSourcesOpen(false); }} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${source.assetId === item.assetId ? "bg-[#f2ffdc] font-semibold" : "bg-[#f8faf7]"}`}><span>{item.label}</span>{source.assetId === item.assetId && <CheckCircleIcon size={18} weight="fill" className="text-[#547e29]" />}</button>)}</div>}</div>
          <div className="mt-5"><p className="text-sm font-semibold">Choose your wallet</p><p className="mt-1 text-xs leading-5 text-[#758174]">Connect the wallet you want to pay from. We will screen its address before creating a payment route.</p><div className="mt-3 grid grid-cols-3 gap-2">{walletOptions.map((wallet) => <button key={wallet.name} onClick={() => setWalletChoice(wallet.name)} className={`flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition ${walletChoice === wallet.name ? "border-[#9bce4d] bg-[#f2ffdc] text-[#31531d]" : "border-[#dce4d8] bg-white text-[#657265]"}`}>{wallet.logo ? <img src={wallet.logo} alt="" className="size-8 rounded-[10px] object-contain" /> : <WalletIcon size={22} weight="duotone" />}<span>{wallet.name}</span></button>)}</div></div>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#f5f8f2] px-3 py-3 text-xs leading-5 text-[#6b7969]"><ShieldCheckIcon size={18} weight="fill" className="shrink-0 text-[#618b32]" /><span>You will first sign a wallet-ownership message. No payment is approved until the next step.</span></div>
          <button className="buyer-action mt-5 w-full" disabled={busy} onClick={connectAndScreenWallet}>{busy ? "Preparing verification…" : `Verify with ${walletChoice}`}</button>
        </section>}
        {stage === "wallet" && quote && <section className="mt-7">
          <div className="rounded-2xl border border-[#bcd987] bg-[#f4ffdf] p-4"><div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#d9ff80] text-[#365429]"><CheckCircleIcon size={20} weight="fill" /></span><div><p className="text-sm font-semibold">Wallet verified</p><p className="mt-1 text-xs leading-5 text-[#587047]">Ready for payment approval · {compliance?.provider ?? "Chain Analysis"}</p></div></div></div>
          <div className="mt-4 border-y border-[#e3e9df] py-4"><div className="flex items-center justify-between"><span className="text-sm text-[#687568]">You send</span><span className="text-lg font-semibold">{quote.quote.amountInFormatted ?? payment.amount} {source.token}</span></div><div className="mt-3 flex items-center justify-between"><span className="text-sm text-[#687568]">Network</span><span className="text-sm font-medium">{source.label}</span></div></div>
          <div className="mt-5 rounded-2xl bg-[#20331f] p-4 text-[#f5faed]"><div className="flex gap-3"><WalletIcon size={21} weight="duotone" className="mt-0.5 text-[#d9ff80]" /><div><p className="text-sm font-semibold">Approve in {walletChoice}</p><p className="mt-1 text-xs leading-5 text-[#c5d4c3]">We will open your wallet with the exact USDC transfer. Check the amount and recipient there before approving.</p></div></div><p className="mt-5 text-[11px] uppercase tracking-[.12em] text-[#b9cbb4]">One-time payment address</p><div className="mt-2 flex items-center gap-2 rounded-xl bg-white/10 p-3"><code className="min-w-0 flex-1 break-all text-xs text-[#f5faed]">{quote.quote.depositAddress}</code><button aria-label="Copy payment address" onClick={() => copy(quote.quote.depositAddress)} className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15"><CopyIcon size={16} weight="bold" /></button></div><button className="mt-4 w-full rounded-xl bg-[#d9ff80] px-4 py-3 text-sm font-semibold text-[#20331f]" disabled={busy} onClick={approvePaymentInWallet}>{busy ? "Waiting for wallet…" : `Pay ${quote.quote.amountInFormatted ?? payment.amount} USDC`}</button></div>
          <details className="mt-5 rounded-xl border border-[#dce4d8] bg-white px-4 py-3"><summary className="cursor-pointer text-sm font-semibold">I already approved the transfer</summary><label className="mt-4 block text-xs font-semibold text-[#536052]">Transaction hash<input value={depositTx} onChange={(event) => setDepositTx(event.target.value)} placeholder="Paste transaction hash" className="mt-2 w-full rounded-xl border border-[#d7e1d3] px-3 py-3 text-sm font-normal outline-none focus:border-[#8abb47]" /></label><button className="buyer-action mt-4 w-full" disabled={busy} onClick={submitDeposit}>{busy ? "Verifying payment…" : "Verify & start NEAR Intent route"}</button></details>
        </section>}
        {stage === "routing" && <IntentRouteProgress payment={payment} source={source} submittedTx={depositTx} routeStatus={routeStatus} onRefresh={() => checkStatus().catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to refresh payment status."))} />}
      </>}
      {stage !== "receipt" && <div className="mt-7 flex items-center justify-between border-t border-[#e4ebe0] pt-4 text-xs text-[#758174]"><span>Merchant receives</span><span className="font-medium text-[#42513f]">{payment.amount} USDC on {payment.settlement_chain}</span></div>}
      {error && <p className="mt-4 text-xs leading-5 text-[#a04b45]">{error}</p>}
    </div>
    {verificationState !== "idle" && <div className="absolute inset-0 z-10 grid place-items-center bg-[#f8fbf5]/90 p-6 backdrop-blur-sm"><div className="w-full rounded-3xl border border-[#dce7d3] bg-white p-6 text-center shadow-[0_24px_55px_-30px_rgba(30,48,29,.35)]">{verificationState === "checking" ? <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#eff8e8] text-[#527d28]"><CircleNotchIcon size={28} weight="bold" className="animate-spin" /></span> : <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#dfffb5] text-[#42651f]"><CheckCircleIcon size={29} weight="fill" /></span>}<p className="mt-5 text-lg font-semibold tracking-[-.03em]">{verificationState === "checking" ? "Verifying your wallet" : "Wallet verified"}</p><p className="mt-2 text-sm leading-6 text-[#687667]">{verificationState === "checking" ? "Checking the connected address before we open the payment approval." : "Your payment approval is ready."}</p><p className="mt-4 text-xs font-medium text-[#5e7e39]">Powered by Chain Analysis</p></div></div>}
  </div></Root>;
}

function Receipt({ payment, source, routeStatus }: { payment: Payment; source: string; routeStatus: string }) {
  const sourceExplorer = payment.source_chain === "Ethereum Sepolia" ? "https://sepolia.etherscan.io" : payment.source_chain === "Arbitrum Sepolia" ? "https://sepolia.arbiscan.io" : payment.source_chain === "Base Sepolia" ? "https://sepolia.basescan.org" : null;
  const destinationExplorer = payment.settlement_chain === "NEAR Testnet" ? "https://testnet.nearblocks.io/txns" : payment.settlement_chain === "Base Sepolia" ? "https://sepolia.basescan.org/tx" : payment.settlement_chain === "Arbitrum Sepolia" ? "https://sepolia.arbiscan.io/tx" : payment.settlement_chain === "Ethereum Sepolia" ? "https://sepolia.etherscan.io/tx" : null;
  return <section><span className="grid size-11 place-items-center rounded-full bg-[#dfffb5] text-[#42651f]"><CheckCircleIcon size={25} weight="fill" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-[.14em] text-[#6f7d6e]">Payment complete</p><h1 className="mt-2 text-[30px] font-semibold leading-none tracking-[-.05em]">Thanks. You’re all set.</h1><p className="mt-3 text-sm leading-6 text-[#657265]">{payment.business_name} received confirmation for your {source} payment.</p><div className="mt-7 divide-y divide-[#edf0ea] rounded-2xl border border-[#dce5d7] bg-white px-4 text-sm"><Row label="Amount" value={payment.amount + " " + payment.settlement_asset} /><Row label="Destination" value={payment.settlement_chain} /><Row label="Status" value={routeStatus.replaceAll("_", " ")} /><Row label="Receipt reference" value={payment.reference_id} mono /><Row label="Payment ID" value={payment.id} mono /></div>{payment.near_tx && <a className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#a9d775] bg-[#f1ffdf] p-4 text-[#274421] transition hover:bg-[#eaffcb]" href={`https://testnet.nearblocks.io/txns/${payment.near_tx}`} target="_blank" rel="noreferrer"><span><span className="block text-[11px] font-semibold uppercase tracking-[.13em] text-[#5d793f]">NEAR testnet · intent swap</span><span className="mt-1 block text-sm font-semibold">View the on-chain swap</span><span className="mt-1 block font-mono text-[11px] text-[#627a53]">{payment.near_tx.slice(0, 9)}…{payment.near_tx.slice(-8)}</span></span><ArrowSquareOutIcon size={20} weight="bold" /></a>}<div className="mt-5 grid gap-2 border-t border-[#e4ebe0] pt-4"><p className="text-xs font-semibold text-[#6f7d6e]">Other transaction details</p>{payment.source_tx && sourceExplorer && <a className="inline-flex items-center gap-2 text-xs font-medium text-[#456d24] underline underline-offset-4" href={`${sourceExplorer}/tx/${payment.source_tx}`} target="_blank" rel="noreferrer">Buyer payment on {payment.source_chain} <ArrowSquareOutIcon size={14} weight="bold" /></a>}{payment.destination_tx && destinationExplorer && <a className="inline-flex items-center gap-2 text-xs font-medium text-[#456d24] underline underline-offset-4" href={`${destinationExplorer}/${payment.destination_tx}`} target="_blank" rel="noreferrer">Merchant receipt on {payment.settlement_chain} <ArrowSquareOutIcon size={14} weight="bold" /></a>}</div></section>;
}

function IntentRouteProgress({ payment, source, submittedTx, routeStatus, onRefresh }: { payment: Payment; source: Source; submittedTx: string; routeStatus: string; onRefresh: () => void }) {
  const status = routeStatus.toUpperCase().replaceAll(" ", "_");
  const sourceTx = payment.source_tx ?? submittedTx;
  const sourceExplorer = source.chain === "Ethereum Sepolia" ? "https://sepolia.etherscan.io/tx" : source.chain === "Arbitrum Sepolia" ? "https://sepolia.arbiscan.io/tx" : source.chain === "Base Sepolia" ? "https://sepolia.basescan.org/tx" : null;
  const intentRunning = ["PROCESSING", "IN_PROGRESS", "PENDING_SWAP", "SWAPPING", "SUCCESS"].some((value) => status.includes(value));
  const complete = status === "SUCCESS";
  const stages: Array<{ label: string; detail: string; state: "done" | "active" | "pending"; href?: string; action?: string }> = [
    { label: "USDC transfer submitted", detail: sourceTx ? `Transaction sent on ${source.chain}` : `Waiting for a transaction on ${source.chain}`, state: sourceTx ? "done" : "active", href: sourceTx && sourceExplorer ? `${sourceExplorer}/${sourceTx}` : undefined, action: sourceTx ? "View source transaction" : undefined },
    { label: "NEAR Intents routing", detail: payment.near_tx ? "Intent execution confirmed on NEAR Testnet" : intentRunning ? "Finding the route to the merchant wallet" : "Route begins after source confirmation", state: payment.near_tx || complete ? "done" : intentRunning ? "active" : "pending", href: payment.near_tx ? `https://testnet.nearblocks.io/txns/${payment.near_tx}` : undefined, action: payment.near_tx ? "View NEAR Intent" : undefined },
    { label: "Merchant payout confirmed", detail: complete ? `${payment.amount} ${payment.settlement_asset} delivered on ${payment.settlement_chain}` : `Sending ${payment.amount} ${payment.settlement_asset} to ${payment.settlement_chain}`, state: complete ? "done" : intentRunning ? "active" : "pending" },
  ];

  return <section className="mt-7 overflow-hidden rounded-2xl border border-[#cfe0ca] bg-white"><div className="border-b border-[#e2ebde] bg-[#f4f9f0] px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#5d793f]">Settlement in progress</p><h2 className="mt-1 text-lg font-semibold tracking-[-.03em]">Your payment is moving through NEAR Intents.</h2><p className="mt-1 text-xs leading-5 text-[#657265]">Folio verifies the source transfer, routes it across chains, then confirms the merchant payout.</p></div><ol className="px-5 py-5">{stages.map((item, index) => <li key={item.label} className={`relative flex gap-3 ${index === stages.length - 1 ? "" : "pb-6"}`}>{index < stages.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[11px] top-6 w-px bg-[#d9e7d5]" />}<RouteMarker state={item.state} /><div className="min-w-0 flex-1 pt-0.5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[#20331f]">{item.label}</p>{item.href && <a href={item.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#456d24] underline underline-offset-4">{item.action}<ArrowSquareOutIcon size={13} weight="bold" /></a>}</div><p className="mt-1 text-xs leading-5 text-[#71806f]">{item.detail}</p></div></li>)}</ol><div className="flex items-center justify-between gap-3 border-t border-[#e2ebde] bg-[#fbfcf9] px-5 py-3"><p className="text-xs text-[#71806f]">Route status: <span className="font-semibold text-[#42513f]">{routeStatus.replaceAll("_", " ")}</span></p><button onClick={onRefresh} className="text-xs font-semibold text-[#456d24] underline underline-offset-4">Refresh status</button></div></section>;
}

function RouteMarker({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") return <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#dfffb5] text-[#42651f]"><CheckCircleIcon size={15} weight="fill" /></span>;
  if (state === "active") return <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#eff8e8] text-[#527d28]"><CircleNotchIcon size={15} weight="bold" className="animate-spin" /></span>;
  return <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-[#dce5d7] bg-white text-[11px] font-semibold text-[#879486]">·</span>;
}

function quoteFromEvents(events: PaymentEvent[]): Quote | null {
  const event = events.find((item) => item.type === "tidepool.quote_ready");
  if (!event) return null;
  try {
    const payload = typeof event.payload === "string" ? JSON.parse(event.payload) as Record<string, unknown> : event.payload;
    if (typeof payload.depositAddress !== "string" || typeof payload.amountIn !== "string") return null;
    return {
      correlationId: typeof payload.correlationId === "string" ? payload.correlationId : "resumed-route",
      quote: {
        depositAddress: payload.depositAddress,
        amountIn: payload.amountIn,
        amountInFormatted: typeof payload.amountInFormatted === "string" ? payload.amountInFormatted : undefined,
      },
    };
  } catch {
    return null;
  }
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="flex justify-between gap-5 py-4"><dt className="text-[#758174]">{label}</dt><dd className={mono ? "font-mono text-xs" : "font-medium"}>{value}</dd></div>; }
