"use client";

import { useState } from "react";
import { ArrowRightIcon, CaretDownIcon, CheckCircleIcon, ClockIcon, CodeIcon, CurrencyCircleDollarIcon, DeviceMobileIcon, ListChecksIcon, ListIcon, PaperPlaneTiltIcon, PlusIcon, QrCodeIcon, ReceiptIcon, ShieldCheckIcon, StorefrontIcon, TrendDownIcon, UserCircleIcon, UsersThreeIcon, XIcon } from "@phosphor-icons/react";

type ProductKey = "collect" | "suppliers" | "team";

const products: Record<ProductKey, { eyebrow: string; title: string; copy: string; action: string; label: string }> = {
  collect: { eyebrow: "Get paid", title: "Accept payments where your customers are.", copy: "Collect through the methods your customers already use, then see settlements and balances in one place.", action: "Explore collections", label: "Incoming payments" },
  suppliers: { eyebrow: "Pay suppliers", title: "Release supplier payments with control built in.", copy: "Create payment runs, set the right approvals, and release funds without losing sight of cash movement.", action: "Explore payouts", label: "Supplier payments" },
  team: { eyebrow: "Pay your team", title: "Move team money without manual work.", copy: "Make contractor, payroll, expense, and reimbursement payouts part of the same operating workflow.", action: "Explore team payouts", label: "Team payouts" },
};

function Mark() { return <span className="mark" aria-hidden="true"><i /><i /><i /></span>; }
function RouteDot({ active = false }: { active?: boolean }) { return <span className={`route-dot ${active ? "route-dot-active" : ""}`} aria-hidden="true" />; }

function ProductCanvas({ product }: { product: ProductKey }) {
  const { label } = products[product];
  const paymentLabel = product === "collect" ? "Incoming payment" : product === "suppliers" ? "Payment run" : "Team payout";
  const detail = product === "collect" ? "Northline GmbH" : product === "suppliers" ? "Woven Mill Co." : "Mira Adebayo";
  return <div className="product-canvas" aria-label={`${label} preview`}>
    <div className="canvas-topline"><span className="canvas-title">{label}</span><span className="canvas-period">This month <CaretDownIcon size={13} weight="bold" /></span></div>
    <div className="canvas-stat"><span>{product === "collect" ? "Collected" : "Scheduled"}</span><strong>{product === "collect" ? "$184,290" : product === "suppliers" ? "$48,750" : "$26,980"}</strong><small><span /> Updated just now</small></div>
    <div className="canvas-rule" />
    <div className="canvas-transaction"><div className={`canvas-icon canvas-icon-${product}`}>{product === "collect" ? <ReceiptIcon size={20} /> : product === "suppliers" ? <PaperPlaneTiltIcon size={20} /> : <UsersThreeIcon size={20} />}</div><div className="canvas-transaction-main"><span>{paymentLabel}</span><strong>{detail}</strong><small>{product === "collect" ? "Settled · USD" : "Awaiting approval"}</small></div><strong className="canvas-amount">{product === "collect" ? "+ $12,460" : "− $8,740"}</strong></div>
    <div className="canvas-rule" />
    <div className="canvas-bottom"><div><span>Route</span><strong>{product === "collect" ? "US · USD" : product === "suppliers" ? "NL · EUR" : "GB · GBP"}</strong></div><div><span>Control</span><strong>{product === "collect" ? "Settled" : "2 approvals"}</strong></div></div>
  </div>;
}

function IntentNetwork() {
  return <div className="intent-network intent-money-flow" aria-label="Customer payments enter Folio at the top and supplier and team payouts leave below">
    <span className="benefit-chip benefit-chip-left-top"><ClockIcon size={14} weight="bold" /> 24/7 settlement</span><span className="benefit-chip benefit-chip-right-top"><TrendDownIcon size={14} weight="bold" /> Lower fees</span>
    <div className="money-stream" aria-hidden="true"><i /><b /></div>
    <section className="money-card money-card-in"><p>Customer payment</p><div><span className="money-icon money-icon-in"><ReceiptIcon size={19} /></span><strong>1,250 USDT</strong><small>Polygon</small></div></section>
    <span className="money-flow-chip money-flow-chip-in">Any asset <b>·</b> Any blockchain</span>
    <section className="money-router"><span><Mark /></span><strong>Folio</strong><small>via NEAR Intents</small></section>
    <div className="outgoing-bridge" aria-label="Folio converts assets to any destination chain"><div className="bridge-assets"><span>USDT</span><span>USDC</span></div><div className="bridge-route"><i /><b>Any chain out</b></div><div className="bridge-chains"><span>Base</span><span>Solana</span></div></div>
    <div className="money-split-stream" aria-hidden="true"><i className="money-split-dot money-split-dot-left" /><i className="money-split-dot money-split-dot-right" /><b className="money-split-arrow money-split-arrow-left" /><b className="money-split-arrow money-split-arrow-right" /></div>
    <section className="money-payouts"><p>Business expenses</p><div className="money-card money-card-out"><span className="money-icon money-icon-out"><PaperPlaneTiltIcon size={17} /></span><div><small>Supplier payout</small><strong>840 USDC</strong><b>Base</b></div></div><div className="money-card money-card-out"><span className="money-icon money-icon-team"><UsersThreeIcon size={17} /></span><div><small>Team payout</small><strong>410 USDC</strong><b>Solana</b></div></div></section>
  </div>;
}

function MerchantCheckout() {
  return <section className="merchant-checkout" id="merchant-checkout" aria-labelledby="merchant-checkout-title">
    <div className="merchant-heading"><h2 id="merchant-checkout-title">Give customers a clear way to pay with digital assets.</h2><p>Use Folio in the checkout gateway or on your POS device—then give customers a familiar payment experience from the first tap.</p><div className="merchant-facts"><span><StorefrontIcon size={16} weight="fill" /> POS device</span><span><CodeIcon size={16} weight="bold" /> Checkout gateway</span><span><CurrencyCircleDollarIcon size={16} weight="bold" /> Any supported asset</span></div></div>
    <div className="merchant-v2-scroll" aria-label="Merchant setup through confirmed digital asset payment"><div className="merchant-v2-journey"><i className="merchant-v2-rail" aria-hidden="true" />
      <article className="merchant-v2-step merchant-v2-integration"><div className="merchant-v2-top"><span>Merchant setup</span><b>01</b></div><h3>Choose an integration</h3><div className="integration-option active"><span><CodeIcon size={18} weight="bold" /></span><div><strong>Checkout gateway</strong><small>Online or payment link</small></div><CheckCircleIcon size={17} weight="fill" /></div><div className="integration-option"><span><StorefrontIcon size={18} weight="fill" /></span><div><strong>POS device</strong><small>In-store checkout</small></div></div><p>Choose how you collect</p></article>
      <article className="merchant-v2-step merchant-v2-payment-type"><div className="merchant-v2-top"><span>Juniper Goods</span><b>02</b></div><div className="checkout-order-row"><span /><div><strong>Studio mug</strong><small>Matte sand · Qty 1</small></div><b>$84.00</b></div><div className="checkout-total"><span>Total</span><strong>$84.00 <em>USD</em></strong></div><small className="checkout-question">Payment type</small><div className="payment-type-row"><span>Debit or credit card</span><b>VISA&nbsp; MC</b><i /></div><div className="payment-type-row"><span>PayPal</span><b>PayPal</b><i /></div><div className="payment-type-row selected"><span>Digital assets</span><b>USDC&nbsp; USDT</b><i /></div><button className="checkout-next">Continue <ArrowRightIcon size={13} /></button><p>Customer selects payment type</p></article>
      <article className="merchant-v2-step merchant-v2-wallet"><div className="merchant-v2-top"><span>Secure payment</span><b>03</b></div><h3>Scan or connect a wallet</h3><div className="wallet-payment"><div className="wallet-qr"><QrCodeIcon size={56} weight="fill" /></div><div><small>Amount due</small><strong>84.00 USD</strong><span>Ready to pay</span></div></div><div className="wallet-connection"><DeviceMobileIcon size={17} weight="bold" /><span>Use any supported wallet</span></div><p>Customer scans to pay</p></article>
      <article className="merchant-v2-step merchant-v2-confirm"><div className="complete-mark"><CheckCircleIcon size={48} weight="fill" /></div><h3>Payment confirmed</h3><strong>84.00 USDT</strong><small>Customer paid from Polygon</small><div className="confirmation-receipt"><span>Merchant receives</span><b>USDC · Base</b></div><p>Confirmation for both sides</p></article>
    </div></div>
  </section>;
}

function Comparison() {
  const [selectedFeature, setSelectedFeature] = useState("settlement");
  const features = [
    { id: "settlement", icon: ClockIcon, label: "Settlement time", folio: "Instant (seconds)", traditional: "1–5 business days" },
    { id: "fees", icon: CurrencyCircleDollarIcon, label: "Fees", folio: "Near-zero", traditional: "2–5% + hidden costs" },
    { id: "chargebacks", icon: ShieldCheckIcon, label: "Chargebacks", folio: "None", traditional: "High risk" },
    { id: "global", icon: PaperPlaneTiltIcon, label: "Global access", folio: "Borderless", traditional: "Region-restricted" },
    { id: "availability", icon: ClockIcon, label: "Availability", folio: "24/7", traditional: "Limited hours" },
    { id: "cross-border", icon: UsersThreeIcon, label: "Cross-border payments", folio: "Up to 10 bps (0.1%)", traditional: "3–8%" },
  ];
  return <section className="comparison-section" aria-labelledby="comparison-title">
    <div className="comparison-intro"><p className="eyebrow">The cost of fragmented payment operations</p><h2 id="comparison-title">Folio vs. traditional payments.</h2><p>Faster, cheaper, and more reliable payments worldwide, built to outperform traditional payment rails with seamless global scalability.</p></div>
    <div className="comparison-scroll"><div className="comparison-table" aria-label="Folio compared with traditional payment operations">
      <div className="comparison-row comparison-header"><div>Feature</div><div><Mark /> Folio</div><div>Traditional payments</div></div>
      {features.map(({ id, icon: Icon, label, folio, traditional }) => <button type="button" className={`comparison-row comparison-choice ${selectedFeature === id ? "is-selected" : ""}`} key={id} onClick={() => setSelectedFeature(id)} aria-pressed={selectedFeature === id}><span className="comparison-feature"><Icon size={18} weight="bold" /><strong>{label}</strong></span><span className="comparison-folio"><CheckCircleIcon size={17} weight="fill" /> {folio}</span><span className="comparison-traditional"><XIcon size={16} /> {traditional}</span></button>)}
    </div></div>
  </section>;
}

function WhoFor() {
  return <section className="audience-section" id="global" aria-labelledby="audience-title">
    <div className="audience-heading"><p className="eyebrow">Who Folio is for</p><h2 id="audience-title">For businesses that move money across borders.</h2><p>Whether you collect at checkout, coordinate a platform, or pay a global operating network, Folio keeps the money movement in one place.</p></div>
    <div className="audience-cards" aria-label="Industries Folio supports"><article className="audience-card audience-card-fintech"><div className="audience-card-heading"><span className="audience-icon"><CurrencyCircleDollarIcon size={25} weight="bold" /></span><h3>Fintech &amp; PSP Platforms</h3></div><p>Add stablecoin collections and payouts to your product through one integration.</p><div><span>Collections</span><span>Payouts</span></div><ArrowRightIcon size={19} /></article><article className="audience-card audience-card-commerce"><div className="audience-card-heading"><span className="audience-icon"><StorefrontIcon size={25} weight="fill" /></span><h3>eCommerce &amp; Marketplace</h3></div><p>Let customers choose digital assets at checkout while you manage settlements in one place.</p><div><span>Checkout</span><span>Seller pay</span></div><ArrowRightIcon size={19} /></article><article className="audience-card audience-card-gaming"><div className="audience-card-heading"><span className="audience-icon"><DeviceMobileIcon size={25} weight="bold" /></span><h3>Gaming &amp; Entertainment</h3></div><p>Collect from global audiences and pay creators or partners without chain-by-chain work.</p><div><span>Global pay-ins</span><span>Creator pay</span></div><ArrowRightIcon size={19} /></article><article className="audience-card audience-card-hospitality"><div className="audience-card-heading"><span className="audience-icon"><ReceiptIcon size={25} weight="bold" /></span><h3>Restaurants &amp; Hospitality</h3></div><p>Bring digital asset payments to online booking, POS, and cross-border supplier payments.</p><div><span>POS-ready</span><span>Supplier pay</span></div><ArrowRightIcon size={19} /></article></div>
  </section>;
}

export function FolioLanding() {
  const [product, setProduct] = useState<ProductKey>("collect");
  const [menuOpen, setMenuOpen] = useState(false);
  const current = products[product];
  return <main className="landing">
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Folio home"><Mark /><span>Folio</span></a>
      <nav className="desktop-nav" aria-label="Main navigation"><a href="#merchant-checkout">Checkout</a><a href="#platform">Platform</a><a href="#developers">Developers</a><a href="#global">Who it&apos;s for</a></nav>
      <div className="nav-actions"><a className="sign-in" href="/console">Business Console</a><a className="header-cta" href="#contact">Talk to us <ArrowRightIcon size={15} /></a><button className="menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <XIcon size={21} /> : <ListIcon size={21} />}</button></div>
      {menuOpen && <nav className="mobile-nav" id="mobile-menu" aria-label="Mobile navigation"><a href="#merchant-checkout" onClick={() => setMenuOpen(false)}>Checkout</a><a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a><a href="#developers" onClick={() => setMenuOpen(false)}>Developers</a><a href="#global" onClick={() => setMenuOpen(false)}>Who it&apos;s for</a><a href="/console" onClick={() => setMenuOpen(false)}>Business Console</a></nav>}
    </header>

    <section className="hero" id="top">
      <div className="hero-copy hero-reveal"><p className="eyebrow"><span className="eyebrow-dot" /> Onchain finance for global businesses</p><h1><span>Your global business</span><span>finance stack, <em>onchain.</em></span></h1><p className="hero-lede">Accept customer payments, manage balances, and pay suppliers and teams onchain from one operating layer. Folio abstracts assets and blockchains, so your business can move money smoothly.</p><div className="hero-actions"><a className="primary-button" href="#contact">Talk to us <ArrowRightIcon size={17} /></a><a className="text-button" href="#platform">Explore the platform <ArrowRightIcon size={16} /></a></div><div className="hero-proof"><span><CheckCircleIcon size={16} weight="fill" /> One integration</span><span><CheckCircleIcon size={16} weight="fill" /> One operating view</span></div></div>
      <div className="hero-art hero-reveal"><div className="signal signal-one" /><div className="signal signal-two" /><div className="ops-window"><div className="ops-topbar"><div className="ops-brand"><Mark /><span>Folio</span></div><span className="ops-live"><i /> Live operations</span><UserCircleIcon size={24} weight="fill" /></div><div className="ops-layout"><aside className="ops-sidebar"><span className="active"><CurrencyCircleDollarIcon size={18} /> Overview</span><span><ReceiptIcon size={18} /> Collections</span><span><PaperPlaneTiltIcon size={18} /> Payments</span><span><ListChecksIcon size={18} /> Approvals</span></aside><div className="ops-content"><div className="ops-content-heading"><div><span>Tuesday, 12 Nov</span><strong>Operations overview</strong></div><button><PlusIcon size={15} /> Create payment</button></div><div className="ops-balance"><div><span>Available balance</span><strong>$284,920<span>.10</span></strong><small><b>+12.4%</b> from last month</small></div><div className="balance-routes"><span>Incoming</span><div><RouteDot active /><i /><RouteDot active /><i /><RouteDot /></div><span>Outgoing</span></div></div><div className="ops-summary"><span>Now moving</span><strong>$31,200 <small>across 4 payments</small></strong><button>View all <ArrowRightIcon size={13} /></button></div><div className="ops-row"><span className="row-icon row-in"><ReceiptIcon size={17} /></span><div><strong>Fennel Systems</strong><span>Customer payment · US</span></div><b>+ $12,460</b><em>Settled</em></div><div className="ops-row"><span className="row-icon row-out"><PaperPlaneTiltIcon size={17} /></span><div><strong>Woven Mill Co.</strong><span>Supplier payment · NL</span></div><b>− $8,740</b><em className="approval">Needs approval</em></div></div></div></div><div className="operation-stack" aria-label="Folio handles collections, supplier payments, and team payouts"><div className="operation-chip"><span className="chip-icon chip-receive"><ReceiptIcon size={15} /></span><div><small>Accept payments</small><strong>Collections received</strong></div><CheckCircleIcon size={15} weight="fill" /></div><div className="operation-chip"><span className="chip-icon chip-supplier"><PaperPlaneTiltIcon size={15} /></span><div><small>Pay suppliers</small><strong>Ready to release</strong></div><ArrowRightIcon size={14} /></div><div className="operation-chip"><span className="chip-icon chip-team"><UsersThreeIcon size={15} /></span><div><small>Pay teammates</small><strong>Payouts scheduled</strong></div><CheckCircleIcon size={15} weight="fill" /></div></div></div><div className="intent-hero hero-reveal"><IntentNetwork /></div>
    </section>

    <MerchantCheckout />

    <section className="product-section" id="platform"><div className="section-intro"><p className="eyebrow">A platform that moves with your business</p><h2>Built around how funds actually move.</h2></div><div className="product-layout"><div className="product-tabs" role="tablist" aria-label="Folio products">{(Object.keys(products) as ProductKey[]).map((key, index) => <button key={key} role="tab" aria-selected={product === key} className={product === key ? "selected" : ""} onClick={() => setProduct(key)}><span>0{index + 1}</span><strong>{products[key].eyebrow}</strong><ArrowRightIcon size={17} /></button>)}</div><div className="product-detail"><div className="product-copy"><p className="eyebrow">{current.eyebrow}</p><h3>{current.title}</h3><p>{current.copy}</p><a className="text-button" href="#contact">{current.action} <ArrowRightIcon size={16} /></a></div><ProductCanvas product={product} /></div></div></section>

    <section className="developer-section" id="developers"><div className="developer-copy"><p className="eyebrow">For developers and operations teams</p><h2>Put digital asset payments inside your checkout.</h2><p>Create a payment in Business Console, then embed Folio where customers pay—online or at the counter. One integration keeps asset and chain complexity out of the customer flow.</p><div><a className="primary-button" href="#contact">View integration docs <CodeIcon size={17} /></a><a className="text-button" href="/console">Open Business Console <ArrowRightIcon size={16} /></a></div></div><div className="code-panel"><div className="code-head"><span><i /><i /><i /></span><b>checkout.tsx</b><em>Widget embed</em></div><pre><code><span className="code-dim">import</span> {"{"} FolioCheckout {"}"} <span className="code-dim">from</span>{"\n"}<span className="code-string">  &quot;@folio/checkout&quot;</span>;{"\n\n"}<span className="code-green">&lt;FolioCheckout</span>{"\n"}  session=<span className="code-string">&quot;pay_7L4p...&quot;</span>{"\n"}  display=<span className="code-string">&quot;modal&quot;</span>{"\n"}  onComplete={"{"}handlePaymentComplete{"}"}{"\n"}<span className="code-green">/&gt;</span></code></pre><div className="code-result"><CheckCircleIcon size={17} weight="fill" /><span>Checkout widget ready</span><b>pay_7L4p...</b></div></div></section>

    <Comparison />

    <WhoFor />

    <section className="closing" id="contact"><div><p className="eyebrow">Move with intention</p><h2>Make efficient money movement part of your operating advantage.</h2></div><a className="light-button" href="mailto:hello@folio.example">Talk to us <ArrowRightIcon size={18} /></a></section>
    <footer id="company"><a className="brand" href="#top"><Mark /><span>Folio</span></a><p>One system for global business money movement.</p><div><a href="#global">Trust &amp; security</a><a href="#company">Privacy</a><a href="#company">Terms</a><span>© 2026 Folio</span></div></footer>
  </main>;
}

export default function Home() {
  return <FolioLanding />;
}
