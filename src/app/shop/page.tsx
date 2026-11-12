"use client";

import { ArrowRightIcon, BankIcon, CheckIcon, CreditCardIcon, CurrencyCircleDollarIcon, ShoppingBagIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PaymentMethod = "card" | "bank" | "crypto";

const methods: Array<{ id: PaymentMethod; title: string; detail: string; available: boolean; icon: typeof CreditCardIcon }> = [
  { id: "card", title: "Credit or debit card", detail: "Visa, Mastercard and more", available: false, icon: CreditCardIcon },
  { id: "bank", title: "Bank transfer", detail: "Pay from your bank account", available: false, icon: BankIcon },
  { id: "crypto", title: "Crypto wallet", detail: "USDC payment · NEAR testnet intent swap", available: true, icon: CurrencyCircleDollarIcon },
];

export default function Shop() {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const chooseMethod = (next: PaymentMethod) => {
    setMethod(next);
    setError("");
  };

  const continueToCheckout = async () => {
    if (method !== "crypto" || creating) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "web", productId: "studio-mug-sand" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to prepare crypto checkout.");
      const id = String(body.data?.id ?? "");
      if (!/^WEB-[A-F0-9]{8}$/.test(id)) throw new Error("The checkout reference was invalid.");
      router.push(`/pay/${id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to prepare crypto checkout.");
    } finally {
      setCreating(false);
    }
  };

  return <main className="min-h-[100dvh] bg-[#F7F5EF] text-[#18372B]">
    <div className="border-b border-[#DFE0D3] bg-[#163C2B] px-5 py-2 text-center text-[11px] font-medium tracking-[.16em] text-[#DCE8D4]">NOOK GOODS · ONLINE STORE</div>
    <header className="border-b border-[#E1E1D6] bg-[#FBFAF6]">
      <div className="mx-auto flex max-w-[1220px] items-center justify-between px-5 py-4 sm:px-8">
        <a href="/shop" className="flex items-center gap-3">
          <Image src="/nook-goods-mark.svg" alt="Nook Goods mark" width={40} height={40} className="size-10 rounded-xl" />
          <span className="font-serif text-2xl tracking-[-.05em]">nook goods<span className="text-[#8E9E79]">.</span></span>
        </a>
        <span className="inline-flex items-center gap-2 text-xs font-medium text-[#637568]"><ShoppingBagIcon size={19} weight="regular" /> Your bag <span className="grid size-5 place-items-center rounded-full bg-[#E3E9D7] text-[10px]">1</span></span>
      </div>
    </header>
    <div className="mx-auto max-w-[1220px] px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
      <div className="mb-7 flex items-center gap-2 text-xs text-[#78867A]"><span>Home</span><span>/</span><span>Ceramics</span><span>/</span><span className="font-medium text-[#314B39]">Studio mug</span></div>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(390px,.94fr)] lg:gap-14">
        <section aria-label="Product details">
          <div className="relative overflow-hidden rounded-[28px] bg-[#E8E1D5]">
            <Image src="/nook-goods-mug.svg" alt="Matte sand ceramic studio mug" width={720} height={780} className="aspect-[1/1.04] w-full object-cover" priority />
            <span className="absolute left-5 top-5 rounded-full bg-[#FBFAF6]/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.1em] text-[#31523B]">Everyday ritual</span>
          </div>
          <div className="mt-7 flex items-start justify-between gap-5">
            <div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#7B8F76]">Nook Ceramics / 01</p><h1 className="mt-2 font-serif text-[clamp(2.5rem,5vw,4.4rem)] leading-[.95] tracking-[-.05em]">Studio mug</h1><p className="mt-3 text-sm text-[#778477]">Matte sand · Hand-finished ceramic</p></div>
            <span className="pt-7 text-xl font-semibold">$2.00</span>
          </div>
          <p className="mt-7 max-w-[540px] text-sm leading-7 text-[#647467]">A quiet companion for your morning routine. A softly rounded shape, comfortable handle, and warm matte finish made for the moments in between.</p>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#DEE2D7] pt-5 text-xs text-[#647467]">
            <span className="flex items-center gap-2"><CheckIcon size={15} weight="bold" /> Ceramic finish</span>
            <span className="flex items-center gap-2"><CheckIcon size={15} weight="bold" /> Carefully packed</span>
            <span className="flex items-center gap-2"><CheckIcon size={15} weight="bold" /> One mug</span>
          </div>
        </section>
        <aside aria-label="Checkout" className="lg:sticky lg:top-8">
          <div className="rounded-[28px] border border-[#DDE2D5] bg-[#FCFCF8] p-5 shadow-[0_24px_65px_-48px_rgba(31,59,39,.35)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#719071]">Secure checkout</p>
            <h2 className="mt-2 font-serif text-[28px] tracking-[-.04em]">Your order</h2>
            <div className="mt-5 flex gap-4 border-b border-[#E5E8DE] pb-4">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-[#EAE5DB]"><Image src="/nook-goods-mug.svg" alt="" width={64} height={64} className="size-full object-cover" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Studio mug</p><p className="mt-1 text-xs text-[#718070]">Matte sand · Qty 1</p><p className="mt-3 text-xs text-[#718070]">Nook Goods</p></div>
              <p className="text-sm font-semibold">$2.00</p>
            </div>
            <div className="space-y-2 border-b border-[#E5E8DE] py-3 text-sm">
              <div className="flex justify-between text-[#6A7A6A]"><span>Subtotal</span><span>$2.00</span></div>
              <div className="flex justify-between text-[#6A7A6A]"><span>Shipping</span><span>Included</span></div>
            </div>
            <div className="flex justify-between py-3 text-base font-semibold"><span>Total</span><span>$2.00 USD</span></div>
            <div className="border-t border-[#E5E8DE] pt-4">
              <h3 className="text-sm font-semibold">How would you like to pay?</h3>
              <p className="mt-1 text-xs text-[#718070]">Choose a method to complete this order.</p>
              <div className="mt-3 space-y-2" role="group" aria-label="Payment method">
                {methods.map(({ id, title, detail, available, icon: Icon }) => <button key={id} type="button" aria-pressed={method === id} onClick={() => chooseMethod(id)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition active:scale-[.99] ${method === id ? "border-[#8FB66D] bg-[#F2F7EA]" : "border-[#DCE2D5] bg-white hover:border-[#AFC69E]"}`}>
                  <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${method === id ? "bg-[#DCEBCB] text-[#234831]" : "bg-[#F0F2EB] text-[#637867]"}`}><Icon size={21} weight="regular" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-[#718070]">{detail}</span></span>
                  {!available && <span className="shrink-0 text-[10px] font-medium text-[#879287]">Not connected</span>}
                  <span aria-hidden="true" className={`grid size-4 shrink-0 place-items-center rounded-full border ${method === id ? "border-[#3D6C40]" : "border-[#AAB8A8]"}`}>{method === id && <span className="size-2 rounded-full bg-[#3D6C40]" />}</span>
                </button>)}
              </div>
              {method && method !== "crypto" && <div role="status" className="mt-4 rounded-xl border border-[#E1E6DC] bg-[#F7F8F3] px-4 py-3 text-xs leading-5 text-[#67796A]">{method === "card" ? "Card processing" : "Bank transfer"} is not connected in this testnet demo. Choose crypto wallet to complete the order.</div>}
              <button type="button" onClick={() => void continueToCheckout()} disabled={method !== "crypto" || creating} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#193B29] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2A5236] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45">{creating ? "Opening secure checkout…" : "Continue to checkout"}<ArrowRightIcon size={18} weight="bold" /></button>
              {method === "crypto" && <p className="mt-3 text-center text-xs leading-5 text-[#718070]">Choose your wallet, then track the swap on NEAR testnet.</p>}
              {error && <p role="alert" className="mt-3 text-xs leading-5 text-[#A5483D]">{error}</p>}
            </div>
            <p className="mt-3 text-center text-[11px] leading-5 text-[#859184]">Testnet demo · No real goods or mainnet funds</p>
          </div>
        </aside>
      </div>
    </div>
  </main>;
}
