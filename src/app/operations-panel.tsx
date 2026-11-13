"use client";

import { ArrowRightIcon, ArrowSquareOutIcon, BankIcon, CheckCircleIcon, CircleNotchIcon, CopyIcon, WalletIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type Wallet = { id: string; label: string; address: string; network: string; role: string; note: string };
type Contact = { id: string; name: string; type: string; destination: string; network: string; email: string };
type BankAccount = { id: string; nickname: string; bank_name: string; account_last_four: string; country: string; currency: string };
type Balance = { balance: string; asset: string; network: string; explorerUrl: string; tokenAddress: string; chainId: string; decimals: number; refreshedAt: string };
type Operation = { id: string; kind: string; recipient: string; amount: string; asset: string; status: string; network: string | null; source_wallet_id: string | null; tx_hash: string | null; near_tx: string | null; destination_tx: string | null; deposit_address: string | null; route_status: string | null; provider_reference: string | null; created_at: string };
type IntentQuote = { quote: { depositAddress: string; amountIn: string; amountInFormatted?: string; amountOutFormatted?: string } };
type Action = "send" | "bank";
type RecipientType = "Supplier" | "Team member";
type MeteorWallet = {
  getAccounts: () => Promise<Array<{ accountId: string }>>;
  signIn: (params: { contractId?: string; methodNames?: string[] }) => Promise<Array<{ accountId: string }>>;
  signAndSendTransaction: (params: { signerId: string; receiverId: string; actions: unknown[] }) => Promise<{ transaction?: { hash?: string } | null } | void>;
};

const shortAddress = (address: string) => address.length > 16 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
const isEvmAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address);
const normalizeTestnetNetwork = (network: string) => network === "Base" ? "Base Sepolia" : network === "Arbitrum" ? "Arbitrum Sepolia" : network;
const txExplorer = (network: string, hash: string) => `${network === "Arbitrum Sepolia" ? "https://sepolia.arbiscan.io" : "https://sepolia.basescan.org"}/tx/${hash}`;
const tokenUnits = (amount: string, decimals: number) => { const [whole, fraction = ""] = amount.split("."); return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0"); };
const operationStatus = (status: string) => ({ confirmed: "Settled", routing: "Swapping through NEAR", submitted: "Confirming", awaiting_wallet_approval: "Awaiting wallet", review_ready: "Ready for review", awaiting_bank_connection: "Awaiting bank connection", simulation_ready: "Legacy demo", simulated_completed: "Legacy demo only", verification_failed: "Could not verify" }[status] ?? status.replaceAll("_", " "));

async function connectMeteorWallet(expectedAccountId: string) {
  const [{ setupWalletSelector }, { setupMeteorWallet }] = await Promise.all([
    import("@near-wallet-selector/core"),
    import("@near-wallet-selector/meteor-wallet"),
  ]);
  const selector = await setupWalletSelector({ network: "testnet", modules: [setupMeteorWallet()] });
  const meteor = await selector.wallet("meteor-wallet") as unknown as MeteorWallet;
  let accounts = await meteor.getAccounts();
  if (!accounts.length) {
    await meteor.signIn({});
    accounts = await meteor.getAccounts();
  }
  if (!accounts.some((account) => account.accountId.toLowerCase() === expectedAccountId.toLowerCase())) {
    throw new Error(`Meteor is connected to a different NEAR account. Select ${expectedAccountId} in Meteor Wallet.`);
  }
  return meteor;
}

export default function OperationsPanel({ wallets, contacts, onAddWallet }: { wallets: Wallet[]; contacts: Contact[]; onAddWallet: () => void }) {
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [balance, setBalance] = useState<Balance | null>(null);
  const [balanceError, setBalanceError] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [action, setAction] = useState<Action>("send");
  const [recipientType, setRecipientType] = useState<RecipientType>("Supplier");
  const [contactId, setContactId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [address, setAddress] = useState("");
  const [recipientNetwork, setRecipientNetwork] = useState("Arbitrum Sepolia");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState({ nickname: "", bankName: "", accountLastFour: "", country: "US", currency: "USD" });
  const [bankFormError, setBankFormError] = useState("");
  const [bankSaving, setBankSaving] = useState(false);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [flowState, setFlowState] = useState<"review" | "connecting" | "quoting" | "awaiting" | "confirming" | "preparing" | "complete" | "failed">("review");
  const [flowError, setFlowError] = useState("");
  const [activeOperation, setActiveOperation] = useState<Operation | null>(null);
  const [activeTxHash, setActiveTxHash] = useState("");
  const [activeNearTx, setActiveNearTx] = useState("");
  const [activeQuote, setActiveQuote] = useState<IntentQuote | null>(null);

  const selectedWallet = wallets.find((wallet) => wallet.id === selectedWalletId)
    ?? wallets.find((wallet) => wallet.network === "Base Sepolia" && wallet.role === "Receiving")
    ?? wallets[0];
  const effectiveWalletId = selectedWallet?.id;
  const relevantContacts = contacts.filter((contact) => recipientType === "Supplier" ? contact.type === "Supplier" : contact.type === "Team member");
  const selectedBankAccount = bankAccounts.find((account) => account.id === bankAccountId);
  const isNearSourceWallet = selectedWallet?.network === "NEAR Testnet";
  const recipientNetworkValid = ["Base Sepolia", "Arbitrum Sepolia"].includes(normalizeTestnetNetwork(recipientNetwork));
  const visibleFormError = formError === "Choose Base Sepolia or Arbitrum Sepolia for the recipient." && recipientNetworkValid ? "" : formError;
  const walletDrafts: Operation[] = [];
  const activeOperationId = activeOperation?.id;

  useEffect(() => {
    if (!effectiveWalletId) return;
    const controller = new AbortController();
    let current = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/wallets/${encodeURIComponent(effectiveWalletId)}/balance`, { signal: controller.signal, cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Balance unavailable.");
        if (current) { setBalance(json.data); setBalanceError(""); setBalanceLoading(false); }
      } catch (reason) {
        if (current) { setBalance(null); setBalanceError(reason instanceof Error ? reason.message : "Balance unavailable."); setBalanceLoading(false); }
      }
    };
    void load();
    return () => { current = false; controller.abort(); };
  }, [effectiveWalletId, refreshKey]);

  useEffect(() => {
    let current = true;
    void fetch("/api/operations").then((response) => response.json()).then((json) => { if (current) setOperations(json.data ?? []); }).catch(() => {});
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    void fetch("/api/bank-accounts", { cache: "no-store" }).then((response) => response.json()).then((json) => { if (current) { const accounts = (json.data ?? []) as BankAccount[]; setBankAccounts(accounts); setBankAccountId((previous) => previous || accounts.find((account) => account.id === "demo_cpn_usd")?.id || accounts[0]?.id || ""); } }).catch(() => {});
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!activeOperationId || flowState !== "confirming") return;
    let current = true;
    const check = async () => {
      try {
        const endpoint = activeOperation?.deposit_address ? `/api/operations/${encodeURIComponent(activeOperationId)}/tidepool/status` : `/api/operations/${encodeURIComponent(activeOperationId)}`;
        const response = await fetch(endpoint, { cache: "no-store" });
        const json = await response.json();
        if (!response.ok || !current) return;
        const updated = json.data as Operation;
        setActiveOperation(updated);
        setOperations((previous) => previous.map((item) => item.id === updated.id ? updated : item));
        if (updated.status === "confirmed") { setFlowState("complete"); setRefreshKey((key) => key + 1); }
        if (["failed", "verification_failed"].includes(updated.status)) { setFlowState("failed"); setFlowError("The chain did not confirm the expected USDC transfer. Check the transaction before trying again."); }
      } catch { /* Keep polling while the testnet RPC is unavailable. */ }
    };
    void check();
    const interval = window.setInterval(() => { void check(); }, 3500);
    return () => { current = false; window.clearInterval(interval); };
  }, [activeOperationId, flowState]);

  const selectWallet = (walletId: string) => {
    setSelectedWalletId(walletId);
    setBalance(null);
    setBalanceError("");
    setBalanceLoading(true);
    setFormError("");
    setSuccess("");
    const next = wallets.find((wallet) => wallet.id === walletId);
    if (next) { setRecipientNetwork(next.network === "Base Sepolia" ? "Arbitrum Sepolia" : "Base Sepolia"); setContactId(""); setAddress(""); }
  };

  const selectContact = (id: string) => {
    setContactId(id);
    const match = relevantContacts.find((contact) => contact.id === id);
    if (match) { setRecipient(match.name); setAddress(match.destination); setRecipientNetwork(normalizeTestnetNetwork(match.network)); setFormError(""); }
  };

  const switchAction = (next: Action) => {
    setAction(next);
    setContactId(""); setRecipient(""); setAddress(""); setBankAccountId(next === "bank" ? (bankAccounts.find((account) => account.id === "demo_cpn_usd")?.id ?? bankAccounts[0]?.id ?? "") : ""); setAmount(""); setReference("");
    setFormError(""); setSuccess("");
  };

  const addBankAccount = async () => {
    setBankFormError(""); setBankSaving(true);
    try {
      const response = await fetch("/api/bank-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bankForm) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not save the bank destination.");
      const created = json.data as BankAccount;
      setBankAccounts((previous) => [created, ...previous]); setBankAccountId(created.id);
      setBankForm({ nickname: "", bankName: "", accountLastFour: "", country: "US", currency: "USD" });
      setBankModalOpen(false);
    } catch (reason) { setBankFormError(reason instanceof Error ? reason.message : "Could not save the bank destination."); }
    finally { setBankSaving(false); }
  };

  const reviewPayment = () => {
    setFormError("");
    setSuccess("");
    if (!selectedWallet) return setFormError("Choose a business wallet first.");
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount)) return setFormError("Enter an amount greater than zero, with up to two decimal places.");
    if (action === "bank" && !selectedBankAccount) return setFormError("Choose or add a bank destination.");
    if (action === "send" && !recipient.trim()) return setFormError("Add a recipient.");
    if (action === "send") {
      if (!["Base Sepolia", "Arbitrum Sepolia", "NEAR Testnet"].includes(selectedWallet.network)) return setFormError("Choose a supported business wallet.");
      if (!["Base Sepolia", "Arbitrum Sepolia"].includes(normalizeTestnetNetwork(recipientNetwork))) return setFormError("Choose Base Sepolia or Arbitrum Sepolia for the recipient.");
      if (!isEvmAddress(address.trim())) return setFormError("Enter a valid 0x recipient wallet address.");
      if (address.trim().toLowerCase() === selectedWallet.address.toLowerCase()) return setFormError("Choose a recipient address different from the source wallet.");
    }
    setFlowState("review"); setFlowError(""); setActiveOperation(null); setActiveTxHash(""); setActiveNearTx(""); setActiveQuote(null); setReviewOpen(true);
  };

  const createOperation = async (intent: "send" | "prepare") => {
    if (!selectedWallet) throw new Error("Choose a business wallet first.");
    const response = await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceWalletId: selectedWallet.id,
        kind: action === "bank" ? "fiat_offramp" : recipientType === "Supplier" ? "supplier_payment" : "team_payment",
        recipient: action === "bank" ? selectedBankAccount?.nickname : recipient.trim(),
        recipientAddress: action === "bank" ? "" : address.trim(),
        network: action === "bank" ? selectedBankAccount?.currency : normalizeTestnetNetwork(recipientNetwork),
        bankAccountId: action === "bank" ? selectedBankAccount?.id : undefined,
        reference: reference.trim(),
        amount: Number(amount).toFixed(2),
        intent,
      }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not create the payment.");
    const created = json.data as Operation;
    setActiveOperation(created);
    setOperations((previous) => [created, ...previous]);
    return created;
  };

  const continuePayment = async () => {
    if (!selectedWallet) return;
    setSaving(true);
    setFlowError("");
    let created: Operation | null = null;
    let sentHash = "";
    try {
      if (action === "bank") {
        setFlowState("preparing");
        created = await createOperation("prepare");
        const response = await fetch(`/api/operations/${encodeURIComponent(created.id)}/prepare`, { method: "POST" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "The payout request could not be prepared.");
        setActiveOperation(json.data);
        setOperations((previous) => previous.map((item) => item.id === created!.id ? json.data : item));
        setFlowState("complete");
      } else if (isNearSourceWallet) {
        setFlowState("connecting");
        const meteor = await connectMeteorWallet(selectedWallet.address);
        created = await createOperation("send");
        setFlowState("quoting");
        const quoteResponse = await fetch(`/api/operations/${encodeURIComponent(created.id)}/tidepool/quote`, { method: "POST" });
        const quoteJson = await quoteResponse.json();
        if (!quoteResponse.ok || !quoteJson.data?.quote?.depositAddress) throw new Error(quoteJson.error ?? "Unable to create a NEAR intent route.");
        const quote = quoteJson.data as IntentQuote;
        if (!/^[a-z0-9._-]+\.testnet$/i.test(quote.quote.depositAddress)) throw new Error("The NEAR route did not return a valid NEAR Testnet deposit account.");
        setActiveQuote(quote);
        created = { ...created, deposit_address: quote.quote.depositAddress, route_status: "QUOTE_READY" };
        setActiveOperation(created);
        setOperations((previous) => previous.map((item) => item.id === created!.id ? created! : item));
        const freshBalanceResponse = await fetch(`/api/wallets/${encodeURIComponent(selectedWallet.id)}/balance`, { cache: "no-store" });
        const freshBalanceJson = await freshBalanceResponse.json();
        if (!freshBalanceResponse.ok) throw new Error(freshBalanceJson.error ?? "Unable to check the source wallet balance.");
        const walletBalance = freshBalanceJson.data as Balance;
        if (BigInt(quote.quote.amountIn) > tokenUnits(walletBalance.balance, walletBalance.decimals)) throw new Error("This NEAR wallet does not hold enough testnet USDC for the quoted payment.");
        setFlowState("awaiting");
        const { actionCreators } = await import("@near-js/transactions");
        const outcome = await meteor.signAndSendTransaction({
          signerId: selectedWallet.address,
          receiverId: "usdc.tidepool-sandbox.testnet",
          actions: [actionCreators.functionCall("ft_transfer", { receiver_id: quote.quote.depositAddress, amount: quote.quote.amountIn, memo: `Folio ${created.id}` }, BigInt("30000000000000"), BigInt(1))],
        });
        const nearTx = outcome?.transaction?.hash;
        if (!nearTx) throw new Error("Meteor did not return a NEAR transaction reference.");
        setActiveNearTx(nearTx);
        const response = await fetch(`/api/operations/${encodeURIComponent(created.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submitNear", nearTx }) });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "The Meteor transaction was sent, but tracking could not start.");
        setActiveOperation(json.data);
        setOperations((previous) => previous.map((item) => item.id === created!.id ? json.data : item));
        setFlowState("confirming");
      } else {
        setFlowState("connecting");
        const providers = window.ethereum?.providers ?? (window.ethereum ? [window.ethereum] : []);
        const rabby = providers.find((provider) => provider.isRabby);
        if (!rabby) throw new Error("Rabby was not found. Open this console in a browser with Rabby installed and unlocked.");
        const freshBalanceResponse = await fetch(`/api/wallets/${encodeURIComponent(selectedWallet.id)}/balance`, { cache: "no-store" });
        const freshBalanceJson = await freshBalanceResponse.json();
        if (!freshBalanceResponse.ok) throw new Error(freshBalanceJson.error ?? "Unable to check the source wallet balance.");
        const walletBalance = freshBalanceJson.data as Balance;
        await rabby.request({ method: "wallet_switchEthereumChain", params: [{ chainId: walletBalance.chainId }] });
        const accounts = await rabby.request({ method: "eth_requestAccounts" }) as string[];
        if (!accounts.some((account) => account.toLowerCase() === selectedWallet.address.toLowerCase())) throw new Error("Rabby is connected to a different address. Select the saved business wallet in Rabby.");
        created = await createOperation("send");
        setFlowState("quoting");
        const quoteResponse = await fetch(`/api/operations/${encodeURIComponent(created.id)}/tidepool/quote`, { method: "POST" });
        const quoteJson = await quoteResponse.json();
        if (!quoteResponse.ok || !quoteJson.data?.quote?.depositAddress) throw new Error(quoteJson.error ?? "Unable to create the NEAR intent route.");
        const quote = quoteJson.data as IntentQuote;
        setActiveQuote(quote);
        created = { ...created, deposit_address: quote.quote.depositAddress, route_status: "QUOTE_READY" };
        setActiveOperation(created);
        setOperations((previous) => previous.map((item) => item.id === created!.id ? created! : item));
        const rawAmount = BigInt(quote.quote.amountIn);
        if (rawAmount > tokenUnits(walletBalance.balance, walletBalance.decimals)) throw new Error("This wallet does not hold enough testnet USDC for the quoted payment.");
        setFlowState("awaiting");
        const data = `0xa9059cbb${quote.quote.depositAddress.slice(2).toLowerCase().padStart(64, "0")}${rawAmount.toString(16).padStart(64, "0")}`;
        sentHash = await rabby.request({ method: "eth_sendTransaction", params: [{ from: selectedWallet.address, to: walletBalance.tokenAddress, data }] }) as string;
        setActiveTxHash(sentHash);
        const depositResponse = await fetch("/api/oneclick/v0/deposit/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ txHash: sentHash, depositAddress: quote.quote.depositAddress }) });
        const depositJson = await depositResponse.json();
        if (!depositResponse.ok) throw new Error(depositJson.message ?? depositJson.error ?? "Your transfer was sent, but Tidepool could not begin tracking it.");
        const response = await fetch(`/api/operations/${encodeURIComponent(created.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", txHash: sentHash }) });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "The wallet sent the transfer, but tracking could not start.");
        setActiveOperation(json.data);
        setOperations((previous) => previous.map((item) => item.id === created!.id ? json.data : item));
        setFlowState("confirming");
      }
    } catch (reason) {
      if (created && !sentHash && action === "send") {
        const response = await fetch(`/api/operations/${encodeURIComponent(created.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) }).catch(() => null);
        if (response?.ok) { const json = await response.json(); setActiveOperation(json.data); setOperations((previous) => previous.map((item) => item.id === created!.id ? json.data : item)); }
      }
      setFlowError(reason instanceof Error ? reason.message : "The payment could not be completed.");
      setFlowState("failed");
    }
    finally { setSaving(false); }
  };

  return <section className="max-w-6xl">
    <div className="rounded-[28px] border border-[#dbe5d6] bg-white p-6 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="text-[22px] font-semibold tracking-[-.03em]">Available operating balance</h2></div>
        {wallets.length > 0 && <label className="field w-full sm:w-72"><span className="sr-only">Business wallet</span><select value={selectedWallet?.id ?? ""} onChange={(event) => selectWallet(event.target.value)} aria-label="Business wallet">{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.label} · {wallet.network}</option>)}</select></label>}
      </div>
      {!selectedWallet ? <div className="mt-6 rounded-2xl border border-dashed border-[#cdd8c8] bg-[#f8faf6] p-5"><p className="text-sm font-semibold">Add a wallet to view funds</p><p className="mt-1 text-sm text-[#718070]">Your saved receiving and operations wallets will appear here.</p><button onClick={onAddWallet} className="action-button mt-4">Add wallet <ArrowRightIcon size={15} weight="bold" /></button></div> : <div className="mt-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="min-h-11 text-[40px] font-semibold leading-none tracking-[-.065em]" aria-live="polite">{balanceLoading || (!balance && !balanceError) ? <span className="inline-block h-8 w-36 animate-pulse rounded-lg bg-[#edf2e9]" /> : balance ? <>{balance.balance} <span className="text-xl text-[#70806a]">USDC</span></> : <span className="text-2xl text-[#718070]">Unavailable</span>}</div>{balance?.explorerUrl && <a href={balance.explorerUrl} target="_blank" rel="noreferrer" className="mb-1 text-xs font-semibold text-[#456d24] underline underline-offset-2">View on chain</a>}</div><p className="mt-2 text-xs text-[#718070]">{balance ? `Updated ${new Date(balance.refreshedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · ${selectedWallet.network}` : balanceError || "Reading the selected wallet…"}</p>
      </div>}
    </div>

    <div className="mt-6 rounded-[28px] border border-[#dfe6dc] bg-white p-6 sm:p-7"><h2 className="text-[22px] font-semibold tracking-[-.03em]">Manage your finances</h2><p className="mt-1 text-sm text-[#657568]">Review the destination and amount before Folio asks your wallet to approve anything.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">
      <button onClick={() => switchAction("send")} aria-pressed={action === "send"} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[.98] ${action === "send" ? "border-[#9fc76b] bg-[#f4ffdf]" : "border-[#dfe6dc] bg-white hover:border-[#bad69c]"}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e9f5df] text-[#416827]"><ArrowRightIcon size={20} weight="bold" /></span><span><span className="block text-sm font-semibold">Pay someone</span><span className="mt-1 block text-xs text-[#718070]">Supplier, contractor or team member</span></span></button>
      <button onClick={() => switchAction("bank")} aria-pressed={action === "bank"} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[.98] ${action === "bank" ? "border-[#9fc76b] bg-[#f4ffdf]" : "border-[#dfe6dc] bg-white hover:border-[#bad69c]"}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e9f5df] text-[#416827]"><BankIcon size={20} weight="duotone" /></span><span><span className="block text-sm font-semibold">Move to bank <span className="font-normal text-[#66805e]">(Circle CPN)</span></span><span className="mt-1 block text-xs text-[#718070]">Create a bank payout request</span></span></button>
    </div></div>

    {selectedWallet && <div className="mt-5 max-w-6xl rounded-[28px] border border-[#dfe6dc] bg-white p-6 sm:p-7">
      {action === "send" && <div><p className="text-sm font-semibold">Who are you paying?</p><div className="mt-2 flex flex-wrap gap-2">{(["Supplier", "Team member"] as RecipientType[]).map((type) => <button key={type} onClick={() => { setRecipientType(type); setContactId(""); setRecipient(""); setAddress(""); }} aria-pressed={recipientType === type} className={`rounded-full border px-4 py-2 text-sm font-medium ${recipientType === type ? "border-[#9fc76b] bg-[#f4ffdf] text-[#31531d]" : "border-[#dfe6dc] bg-white text-[#61705f]"}`}>{type}</button>)}</div></div>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {action === "send" && relevantContacts.length > 0 && <label className="field sm:col-span-2"><span>Saved contact (optional)</span><select value={contactId} onChange={(event) => selectContact(event.target.value)}><option value="">Enter a new recipient</option>{relevantContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label>}
        {action === "send" ? <label className="field"><span>Recipient name</span><input value={recipient} onChange={(event) => { setRecipient(event.target.value); setContactId(""); setFormError(""); }} placeholder="Name or business" /></label> : <div className="sm:col-span-2"><label className="field"><span>Bank destination</span><select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)}><option value="">Choose a saved bank account</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.nickname} · {account.bank_name} ••••{account.account_last_four} · {account.currency}</option>)}</select></label><button onClick={() => { setBankFormError(""); setBankModalOpen(true); }} className="mt-2 text-sm font-semibold text-[#456d24] underline underline-offset-2">Add bank account</button>{selectedBankAccount && <p className="mt-2 text-xs text-[#718070]">{selectedBankAccount.bank_name} · ••••{selectedBankAccount.account_last_four} · {selectedBankAccount.country} · {selectedBankAccount.currency}</p>}</div>}
        <label className="field"><span>Amount (USDC)</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
        {action === "send" && <><label className="field"><span>Recipient wallet address</span><input value={address} onChange={(event) => { setAddress(event.target.value); setContactId(""); setFormError(""); }} placeholder="0x…" /></label><label className="field"><span>Recipient network</span><select value={normalizeTestnetNetwork(recipientNetwork)} onChange={(event) => { setRecipientNetwork(event.target.value); setFormError(""); }}><option>Base Sepolia</option><option>Arbitrum Sepolia</option></select></label></>}
        <label className="field sm:col-span-2"><span>{action === "send" ? "Invoice or payment reference (optional)" : "Withdrawal note (optional)"}</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder={action === "send" ? "Invoice or reason for payment" : "What is this withdrawal for?"} /></label>
      </div>
      {visibleFormError && <p role="alert" className="mt-4 text-sm text-[#a04b45]">{visibleFormError}</p>}
      {success && <p role="status" className="mt-4 flex items-start gap-2 text-sm text-[#436e2e]"><CheckCircleIcon size={17} weight="fill" className="mt-0.5 shrink-0" />{success}</p>}
      <button onClick={reviewPayment} className="action-button mt-6">{action === "send" ? "Submit payment" : "Review payout"} <ArrowRightIcon size={16} weight="bold" /></button>
      {action === "bank" && <p className="mt-3 text-xs text-[#718070]">Payout requests stay pending until Circle CPN is connected. No funds move at this stage.</p>}
    </div>}
    {walletDrafts.length > 0 && <div className="mt-8 max-w-6xl"><h3 className="text-sm font-semibold">Recent operations for this wallet</h3><div className="mt-3 divide-y divide-[#e5ebe1] rounded-2xl border border-[#dfe6dc] bg-white px-4">{walletDrafts.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{item.recipient}</p><p className="mt-1 text-xs text-[#718070]">{item.kind === "fiat_offramp" ? "Bank payout request" : "NEAR intent payment"} · {operationStatus(item.status)}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{item.near_tx && <a href={`https://testnet.nearblocks.io/txns/${item.near_tx}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#456d24] underline underline-offset-2">NEAR swap <ArrowSquareOutIcon size={12} /></a>}{item.tx_hash && <a href={txExplorer(selectedWallet!.network, item.tx_hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#456d24] underline underline-offset-2">Source payment <ArrowSquareOutIcon size={12} /></a>}{item.destination_tx && <a href={txExplorer(item.network ?? "", item.destination_tx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#456d24] underline underline-offset-2">Recipient payout <ArrowSquareOutIcon size={12} /></a>}</div></div><p className="shrink-0 font-semibold">{item.amount} USDC</p></div>)}</div></div>}
    {reviewOpen && selectedWallet && <div className="fixed inset-0 z-20 grid place-items-center bg-[#18221a]/45 p-4"><div role="dialog" aria-modal="true" aria-label={action === "send" ? "Review testnet payment" : "Review bank payout"} className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_30px_70px_-25px_rgba(20,35,20,.38)] sm:p-7">
      {flowState === "complete" ? <><span className="grid size-12 place-items-center rounded-full bg-[#d9ff80] text-[#365429]"><CheckCircleIcon size={27} weight="fill" /></span><p className="eyebrow mt-6">{action === "send" ? "NEAR intent settled" : "Payout request prepared"}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{action === "send" ? "Payment delivered." : "Ready for bank connection."}</h3><p className="mt-3 text-sm leading-6 text-[#718070]">{action === "send" ? "The intent swap completed on NEAR testnet and the recipient payout has been recorded." : "Your payout request is saved. It has not been sent to Circle or to a bank; no funds have moved."}</p><div className="mt-5 rounded-xl bg-[#f5f8f2] p-4 text-sm"><p>Reference: <span className="font-mono text-xs">{activeOperation?.provider_reference ?? activeOperation?.id}</span></p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{activeOperation?.near_tx && <a href={`https://testnet.nearblocks.io/txns/${activeOperation.near_tx}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-[#456d24] underline underline-offset-2">View NEAR intent swap <ArrowSquareOutIcon size={15} /></a>}{activeNearTx && <a href={`https://testnet.nearblocks.io/txns/${activeNearTx}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-[#456d24] underline underline-offset-2">View Meteor payment <ArrowSquareOutIcon size={15} /></a>}{activeTxHash && <a href={txExplorer(selectedWallet.network, activeTxHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-[#456d24] underline underline-offset-2">View source payment <ArrowSquareOutIcon size={15} /></a>}</div></div><button onClick={() => { setReviewOpen(false); setRecipient(""); setAddress(""); setBankAccountId(""); setAmount(""); setReference(""); setContactId(""); }} className="action-button mt-6 w-full">Done</button></> : <>
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{action === "send" ? "Payment details" : "Bank payout request"}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{flowState === "review" ? "Review the details" : action === "send" ? "Following your intent swap" : "Preparing your request"}</h3></div>{flowState === "review" && <button onClick={() => setReviewOpen(false)} className="text-xs font-semibold text-[#718070] underline underline-offset-2">Edit</button>}</div>
        <div className="mt-6 divide-y divide-[#e8ede5] rounded-2xl border border-[#dfe6dc] px-4 text-sm"><div className="flex justify-between gap-4 py-3"><span className="text-[#718070]">From</span><span className="text-right font-medium">{selectedWallet.label}<br/><small className="font-normal text-[#718070]">{shortAddress(selectedWallet.address)} · {selectedWallet.network}</small></span></div><div className="flex justify-between gap-4 py-3"><span className="text-[#718070]">To</span><span className="text-right font-medium">{action === "send" ? recipient : selectedBankAccount?.nickname}<br/><small className="font-normal text-[#718070]">{action === "send" ? shortAddress(address) : `${selectedBankAccount?.bank_name} · ••••${selectedBankAccount?.account_last_four} · ${selectedBankAccount?.currency}`}</small></span></div><div className="flex justify-between gap-4 py-3"><span className="text-[#718070]">Amount</span><strong>{Number(amount).toFixed(2)} USDC</strong></div></div>
        {action === "bank" && <p className="mt-4 rounded-xl bg-[#f5f8f2] p-3 text-xs leading-5 text-[#5e7058]">This creates a local payout request only. Circle CPN is not connected, so the request cannot be executed yet.</p>}
        {action === "send" && activeQuote && <div className="mt-4 rounded-xl border border-[#c8e298] bg-[#f4ffdf] p-3 text-xs leading-5 text-[#4d663d]"><strong className="block text-[#31531d]">Quoted through NEAR Intent</strong> {isNearSourceWallet ? "Meteor will send" : "Rabby will send"} {activeQuote.quote.amountInFormatted ?? activeQuote.quote.amountIn} USDC. The recipient receives {activeQuote.quote.amountOutFormatted ?? amount} USDC on {recipientNetwork}.</div>}
        {flowState !== "review" && <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#f5f8f2] p-4 text-sm"><CircleNotchIcon size={20} weight="bold" className="shrink-0 animate-spin text-[#628b34]" /><span>{flowState === "connecting" ? isNearSourceWallet ? "Connecting Meteor Wallet and checking funds…" : "Connecting Rabby and checking funds…" : flowState === "quoting" ? "Creating a NEAR intent route…" : flowState === "awaiting" ? isNearSourceWallet ? "Approve the exact quoted amount in Meteor Wallet…" : "Approve the exact quoted amount in Rabby…" : flowState === "confirming" ? "Settling the intent through NEAR testnet…" : flowState === "preparing" ? "Saving your payout request…" : "Review the issue below."}</span></div>}
        {activeTxHash && <a href={txExplorer(selectedWallet.network, activeTxHash)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#456d24] underline underline-offset-2">View submitted transaction <ArrowSquareOutIcon size={14} /></a>}
        {flowError && <p role="alert" className="mt-4 text-sm text-[#a04b45]">{flowError}</p>}
        {flowState === "review" && <button onClick={() => void continuePayment()} disabled={saving} className="action-button mt-6 w-full">{action === "send" ? isNearSourceWallet ? "Connect Meteor & submit payment" : "Submit payment in Rabby" : "Create payout request"}</button>}
        {flowState === "failed" && <button onClick={() => setReviewOpen(false)} className="action-button mt-6 w-full">Close</button>}
        {flowState === "confirming" && <button onClick={() => setReviewOpen(false)} className="mt-5 w-full text-center text-xs font-semibold text-[#456d24] underline underline-offset-2">Continue in the background</button>}
      </>}
    </div></div>}
    {bankModalOpen && <div className="fixed inset-0 z-30 grid place-items-center bg-[#18221a]/45 p-4"><div role="dialog" aria-modal="true" aria-label="Add bank account" className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_30px_70px_-25px_rgba(20,35,20,.38)] sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Bank destinations</p><h3 className="mt-2 text-xl font-semibold">Add a bank account</h3></div><button onClick={() => setBankModalOpen(false)} className="text-sm text-[#718070]">Close</button></div><p className="mt-2 text-xs leading-5 text-[#718070]">For the demo, save identifying details only. Do not enter a full account number.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="field sm:col-span-2"><span>Nickname</span><input value={bankForm.nickname} onChange={(event) => setBankForm({ ...bankForm, nickname: event.target.value })} placeholder="Operating account" /></label><label className="field sm:col-span-2"><span>Bank name</span><input value={bankForm.bankName} onChange={(event) => setBankForm({ ...bankForm, bankName: event.target.value })} placeholder="Your bank" /></label><label className="field"><span>Last four digits</span><input inputMode="numeric" maxLength={4} value={bankForm.accountLastFour} onChange={(event) => setBankForm({ ...bankForm, accountLastFour: event.target.value.replace(/\D/g, "") })} placeholder="••••" /></label><label className="field"><span>Country code</span><input maxLength={2} value={bankForm.country} onChange={(event) => setBankForm({ ...bankForm, country: event.target.value.toUpperCase() })} placeholder="US" /></label><label className="field sm:col-span-2"><span>Payout currency</span><select value={bankForm.currency} onChange={(event) => setBankForm({ ...bankForm, currency: event.target.value })}><option>USD</option><option>EUR</option><option>GBP</option></select></label></div>{bankFormError && <p role="alert" className="mt-4 text-sm text-[#a04b45]">{bankFormError}</p>}<button onClick={() => void addBankAccount()} disabled={bankSaving} className="action-button mt-6 w-full">{bankSaving ? "Saving…" : "Save bank destination"}</button></div></div>}
  </section>;
}
