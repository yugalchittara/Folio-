"use client";

import { CheckCircleIcon, CopyIcon, GlobeHemisphereWestIcon, KeyIcon, PlusIcon, TerminalWindowIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

type Integration = { id: string; name: string; type: "online_checkout" | "pos_sdk"; status: "active"; key_prefix: string; merchant_name: string; merchant_wallet_id: string | null };
type Wallet = { id: string; label: string; network: string; role: string };
type Form = { name: string; type: Integration["type"]; webhookUrl: string; merchantName: string; merchantWalletId: string };

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <button onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1400); }} className="inline-flex items-center gap-1 rounded-lg border border-[#d6e0d3] px-2.5 py-2 text-xs font-semibold text-[#53705a]">{copied ? <CheckCircleIcon size={15} weight="fill" /> : <CopyIcon size={15} />}{copied ? "Copied" : "Copy"}</button>;
}

export default function IntegrationsViewV2() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [created, setCreated] = useState<{ secret: string } | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Form>({ name: "", type: "online_checkout", webhookUrl: "", merchantName: "", merchantWalletId: "" });
  const receivingWallets = wallets.filter((wallet) => wallet.role === "Receiving");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [integrationsResponse, walletsResponse] = await Promise.all([fetch("/api/integrations", { cache: "no-store" }), fetch("/api/wallets", { cache: "no-store" })]);
      const [integrationJson, walletJson] = await Promise.all([integrationsResponse.json(), walletsResponse.json()]);
      if (!integrationsResponse.ok) throw new Error(integrationJson.error);
      setIntegrations(integrationJson.data ?? []); setWallets(walletJson.data ?? []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load integrations."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const walletFor = (integration: Integration) => wallets.find((wallet) => wallet.id === integration.merchant_wallet_id);
  const openModal = () => { setError(""); setForm({ name: "", type: "online_checkout", webhookUrl: "", merchantName: "", merchantWalletId: receivingWallets[0]?.id ?? "" }); setModalOpen(true); };
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    const response = await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await response.json();
    if (!response.ok) return setError(json.error ?? "Could not create integration.");
    setCreated(json.data); setModalOpen(false); void refresh();
  };
  const remove = async (integration: Integration) => {
    setError("");
    const confirmed = window.confirm(`Remove “${integration.name}”? This removes the Folio connection and its credentials only. It does not remove the mapped wallet or historical payment records.`);
    if (!confirmed) return;
    const response = await fetch(`/api/integrations?id=${encodeURIComponent(integration.id)}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return setError(json.error ?? "Could not remove integration.");
    void refresh();
  };

  return <>
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[11px] font-semibold uppercase tracking-[.15em] text-[#718070]">Integrations</p><h1 className="mt-3 text-[40px] font-semibold leading-[.98] tracking-[-.055em] text-[#17251d] sm:text-[52px]">Connect where you accept payment.</h1><p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#728075]">Set up the merchant name and receiving wallet independently for each POS terminal or online store.</p></div><button onClick={openModal} className="inline-flex items-center gap-2 rounded-xl bg-[#203b26] px-4 py-3 text-sm font-semibold text-white"><PlusIcon size={17} /> New integration</button></div>
    <section className="mt-8 rounded-[28px] border border-[#dfe6dc] bg-white p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-[20px] font-semibold tracking-[-.03em]">Your integrations</h2><p className="mt-1 text-sm text-[#718070]">Each payment request carries the selected merchant and receiving wallet.</p></div><span className="rounded-full bg-[#f1f6ed] px-3 py-1 text-xs font-semibold text-[#607362]">{integrations.length} active</span></div>{loading ? <div className="mt-5 h-20 animate-pulse rounded-2xl bg-[#eef2ec]" /> : integrations.length ? <div className="mt-5 divide-y divide-[#edf1eb]">{integrations.map((integration) => { const wallet = walletFor(integration); return <div key={integration.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#edf7e6] text-[#3b713f]">{integration.type === "online_checkout" ? <GlobeHemisphereWestIcon size={20} /> : <TerminalWindowIcon size={20} />}</span><div><strong className="block text-sm">{integration.name}</strong><span className="mt-1 block text-xs text-[#718070]">{integration.merchant_name || "Merchant not configured"} · {integration.type === "online_checkout" ? "Online checkout" : "POS SDK"}</span><span className="mt-1 block text-xs text-[#718070]">{wallet ? `${wallet.label} · ${wallet.network}` : "Receiving wallet not configured"}</span></div></div><div className="flex items-center gap-3"><span className="rounded-full bg-[#edf8df] px-2.5 py-1 text-xs font-semibold text-[#477438]">Active</span><button onClick={() => void remove(integration)} className="inline-flex items-center gap-1 rounded-lg border border-[#f0d7d1] px-2.5 py-2 text-xs font-semibold text-[#aa5045] hover:bg-[#fff6f4]"><TrashIcon size={15} /> Remove</button></div></div>; })}</div> : <div className="mt-5 rounded-2xl bg-[#f7f9f5] px-5 py-8 text-center"><p className="text-sm font-semibold text-[#425344]">No integrations yet</p><p className="mt-1 text-sm text-[#718070]">Create one POS integration and one online checkout integration to keep their receiving wallets separate.</p></div>}</section>
    <section className="mt-5 rounded-[28px] border border-[#dfe6dc] bg-white p-6"><h2 className="text-[20px] font-semibold tracking-[-.03em]">How attribution works</h2><div className="mt-5 grid gap-5 md:grid-cols-3"><Step number="1" title="Configure the channel" copy="Save the merchant name and receiving wallet in Folio." /><Step number="2" title="Create a payment" copy="The POS or store sends its integration ID with the order." /><Step number="3" title="Record the outcome" copy="Folio links the payment, KYT record, and wallet destination." /></div></section>
    {modalOpen && <div role="dialog" aria-modal="true" className="fixed inset-0 z-30 grid place-items-center bg-[#152016]/35 p-5"><form onSubmit={create} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_24px_60px_rgba(28,48,34,.22)]"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.15em] text-[#718070]">New integration</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Configure the payment destination.</h2></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-lg border border-[#dce5d9] text-[#607161]"><XIcon size={18} /></button></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><Choice selected={form.type === "online_checkout"} onClick={() => setForm({ ...form, type: "online_checkout" })} icon={<GlobeHemisphereWestIcon size={20} />} title="Online checkout" copy="Storefront or app" /><Choice selected={form.type === "pos_sdk"} onClick={() => setForm({ ...form, type: "pos_sdk" })} icon={<TerminalWindowIcon size={20} />} title="POS SDK" copy="Counter or terminal" /></div><Field label="Integration name"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={form.type === "online_checkout" ? "Nook Goods Online Store" : "Nook Goods Counter 02"} /></Field><Field label="Merchant name shown to buyers"><input required value={form.merchantName} onChange={(event) => setForm({ ...form, merchantName: event.target.value })} placeholder="Example: Nook Goods" /></Field><Field label="Receiving wallet"><select required value={form.merchantWalletId} onChange={(event) => setForm({ ...form, merchantWalletId: event.target.value })}><option value="">Choose a saved receiving wallet</option>{receivingWallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.label} · {wallet.network}</option>)}</select></Field>{!receivingWallets.length && <p className="mt-4 text-sm text-[#a04b45]">Add a wallet with use set to Receiving before creating an integration.</p>}<Field label="Webhook URL (optional)"><input value={form.webhookUrl} onChange={(event) => setForm({ ...form, webhookUrl: event.target.value })} placeholder="https://your-store.com/api/folio-webhook" /></Field>{error && <p role="alert" className="mt-4 text-sm text-[#9a3c30]">{error}</p>}<button disabled={!receivingWallets.length} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#203b26] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><KeyIcon size={17} /> Create integration</button></form></div>}
    {created && <div role="dialog" aria-modal="true" className="fixed inset-0 z-30 grid place-items-center bg-[#152016]/35 p-5"><div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-[0_24px_60px_rgba(28,48,34,.22)]"><p className="text-[11px] font-semibold uppercase tracking-[.15em] text-[#56813f]">Integration created</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Save this secret key.</h2><div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-[#f5f7f2] p-4"><code className="break-all text-xs text-[#263c2c]">{created.secret}</code><CopyButton value={created.secret} /></div><button onClick={() => setCreated(null)} className="mt-6 w-full rounded-xl bg-[#203b26] px-5 py-3 text-sm font-semibold text-white">Done</button></div></div>}
  </>;
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) { return <div><span className="grid size-8 place-items-center rounded-full bg-[#e8f6df] text-xs font-semibold text-[#3d6e43]">{number}</span><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-5 text-[#718070]">{copy}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-4 grid gap-2 text-sm font-semibold text-[#344538]"><span>{label}</span>{children}</label>; }
function Choice({ selected, onClick, icon, title, copy }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; copy: string }) { return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left ${selected ? "border-[#a9d85d] bg-[#f2ffdf]" : "border-[#dfe6dc]"}`}>{icon}<strong className="mt-4 block text-sm">{title}</strong><span className="mt-1 block text-xs text-[#718070]">{copy}</span></button>; }
