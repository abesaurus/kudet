
const STEPS = [
  {
    no: 'Step 01',
    title: 'Load your wallet',
    body: 'Connect your Robinhood Chain wallet and deposit ETH, USDG or tokenized stocks. No bank account, no paperwork.',
    rows: [
      { k: 'ETH', v: '0.42', g: false },
      { k: 'USDG', v: '250.00', g: false },
      { k: 'Wallet', v: 'CONNECTED ✓', g: true },
    ],
  },
  {
    no: 'Step 02',
    title: 'Start earning',
    body: 'Your balance is deployed automatically. It compounds in the background until you spend it — nothing to configure.',
    rows: [
      { k: 'APY', v: '5.4%', g: true },
      { k: 'Earning / yr', v: '$67.30', g: false },
      { k: 'Status', v: 'COMPOUNDING', g: true },
    ],
  },
  {
    no: 'Step 03',
    title: 'Spend anywhere',
    body: 'Groceries, online checkout, subscriptions: the card works wherever cards are accepted.',
    rows: [
      { k: 'Txn', v: '- $48.20', g: false },
      { k: 'Yield paused', v: 'on txn', g: false },
      { k: 'Status', v: 'APPROVED', g: true },
    ],
  },
  {
    no: 'Step 04',
    title: 'Track & top up',
    body: 'Every purchase shows up in real time. Running low? Top up from your wallet in seconds.',
    rows: [
      { k: 'Balance', v: '$1,240.00', g: true },
      { k: 'Top up', v: '+ $250', g: false },
      { k: 'Yield', v: 'RESUMED', g: true },
    ],
  },
];

const FEATURES = [
  {
    no: '01',
    title: 'Earn on every dollar',
    body: 'Your loaded balance is deployed into lending protocols automatically and compounds in the background. Idle money stops being idle — until you swipe, it\u2019s earning.',
  },
  {
    no: '02',
    title: 'One balance, any asset',
    body: 'ETH, USDG, or tokenized stocks and ETFs on Robinhood Chain all feed a single card balance. No conversion juggling, no off-ramp, no separate accounts.',
  },
  {
    no: '03',
    title: 'Yield pauses when you pay',
    body: 'Spending is exact to the cent. The moment a transaction clears, the yield on that amount settles and the rest keeps earning — no rounding, no surprise fees.',
  },
  {
    no: '04',
    title: 'Programmable limits',
    body: 'Set per-transaction and monthly caps, freeze and unfreeze instantly, and get a notification on every single purchase — all onchain, all verifiable.',
  },
  {
    no: '05',
    title: 'Spend-first, never in debt',
    body: 'You can only spend what you\u2019ve loaded plus what your balance has earned. No overdrafts, no credit checks, no surprises at the till.',
  },
  {
    no: '06',
    title: 'Settled on Robinhood Chain',
    body: 'Every load, every yield payment, every top-up is an onchain transaction you can verify yourself. Low fees, fast finality, full transparency.',
  },
];

const FEE_ROWS = [
  { label: 'New card — $10 load', sub: '$5.00 fee + $10 balance', fee: '$5.00', apy: '5.4%', g: false },
  { label: 'New card — $20 load', sub: '$5.00 fee + $20 balance', fee: '$5.00', apy: '5.4%', g: false },
  { label: 'New card — $50 load', sub: '$5.00 fee + $50 balance', fee: '$5.00', apy: '5.4%', g: false },
  { label: 'New card — $100 load', sub: '$5.00 fee + $100 balance', fee: '$5.00', apy: '5.4%', g: false },
  { label: 'New card — $250 load', sub: '$5.00 fee + $250 balance', fee: '$5.00', apy: '5.4%', g: false },
  { label: 'Top-up', sub: 'minimum $10.00, up to $1,000.00 per top-up', fee: 'FREE', apy: 'resumes', g: true },
  { label: 'Monthly fee', sub: 'no hidden recurring costs', fee: 'FREE', apy: 'FREE', g: true },
  { label: 'Network gas', sub: 'paid to Robinhood Chain, shown by your wallet', fee: 'FREE', apy: '—', g: true },
];

const FAQS = [
  {
    q: 'How is Hybrid Cash different from a normal prepaid card?',
    a: 'A normal prepaid card holds your money idle. Hybrid Cash deploys your loaded balance into onchain lending protocols automatically, so it earns yield in the background right up until you spend it. Same spending, plus earning.',
  },
  {
    q: 'What does "hybrid" actually mean?',
    a: 'Hybrid means crypto and cash working as one. Your crypto assets (ETH, USDG, tokenized stocks) become a card balance you can spend anywhere — while still earning like a DeFi position. Two worlds, one card.',
  },
  {
    q: 'How does the yield work?',
    a: 'When you load your card, the balance is deposited into lending markets on Robinhood Chain. Interest accrues and compounds continuously. The APY is variable and tracks onchain rates — you can verify every yield payment on-chain.',
  },
  {
    q: 'Do I have to convert my ETH first?',
    a: 'No. Deposit ETH, USDG or tokenized stocks directly and they all feed one card balance. The conversion happens automatically at the point of spend — you never touch an exchange.',
  },
  {
    q: 'When does my yield stop?',
    a: 'Only on the exact amount you spend. When a transaction clears, that portion\u2019s yield settles to the cent; the remaining balance keeps earning with zero interruption.',
  },
  {
    q: 'Can I spend more than I loaded?',
    a: 'No — and that\u2019s the point. You can only spend what you\u2019ve loaded plus what your balance has earned. No overdrafts, no credit checks, no surprise negative balances.',
  },
  {
    q: 'Where can I use the card?',
    a: 'Groceries, online checkout, dining, fuel, travel, subscriptions — anywhere cards are accepted, including Apple Pay and Google Pay.',
  },
  {
    q: 'Is Hybrid Cash a bank?',
    a: 'No. Hybrid Cash is a financial technology product on Robinhood Chain. Card balances are not bank deposits and are not insured. Yield is variable and not guaranteed. Cards are issued by our issuing partner.',
  },
  {
    q: 'Can I get a physical card?',
    a: 'Yes. A virtual card is issued instantly and added to your phone wallet; the physical card ships to you and works exactly the same, with contactless support.',
  },
];

export default function Page() {
  return (
    <>
      {/* ===== NAV ===== */}
      <nav id="topnav" aria-label="Primary navigation">
        <a className="nav-logo nav-left" href="#home" aria-label="Hybrid Cash home">
          <img src="/assets/logo.svg" alt="Hybrid Cash" />
        </a>
        <div className="nav-links nav-right" id="navLinks">
          <a href="#how">Load</a>
          <a href="#features">Earn</a>
          <a href="#fees">Fees</a>
          <a href="#faq">FAQ</a>
          <a href="#cta">Start</a>
        </div>
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a className="nav-cta js-get-card" href="#cta">
            Start earning
          </a>
          <button className="menu-btn" id="menuBtn" aria-label="Toggle menu">
            ☰
          </button>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <header className="hero" id="home">
        <div className="hero-layout">
          <div className="hero-copy">
            <h1>
              <span>The card that</span>
              <span className="accent">earns</span>
              <span>while you spend</span>
            </h1>
            <p>
              Load ETH, USDG or tokenized stocks on Robinhood Chain. Spend
              anywhere cards are accepted. Your balance keeps earning yield in
              the background — right up to the moment you swipe.
            </p>
            <a className="trial-button js-get-card" href="#cta">
              START EARNING <span className="arr">→</span>
            </a>
            <div className="hero-stats">
              <div className="stat">
                <div className="num">5.4%</div>
                <div className="lbl">APY on balance</div>
              </div>
              <div className="stat">
                <div className="num">~2s</div>
                <div className="lbl">To spendable</div>
              </div>
              <div className="stat">
                <div className="num">100M+</div>
                <div className="lbl">Merchants</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card" role="img" aria-label="Hybrid Cash prepaid card mockup">
              <div className="card-brand">
                <div className="word">
                  HYBRID<em>CASH</em>
                </div>
                <div className="ticker">$HCASH</div>
              </div>
              <div className="chip" aria-hidden="true"></div>
              <div className="card-num">•••• &nbsp;•••• &nbsp;•••• &nbsp;4021</div>
              <div className="card-foot">
                <div>
                  <div className="lbl">Card holder</div>
                  <div className="val">YOUR NAME</div>
                </div>
                <div>
                  <div className="lbl">Earning</div>
                  <div className="val" style={{ color: 'var(--green)' }}>
                    5.4% APY
                  </div>
                </div>
                <div className="contact">hybrid cash</div>
              </div>
            </div>
            <div className="insight-card">
              <div className="ic-top">
                Earning yield <span className="dot"></span>
              </div>
              <div className="insight-row">
                <span className="k">ETH</span>
                <span className="v">0.42</span>
              </div>
              <div className="insight-row">
                <span className="k">USDG</span>
                <span className="v">250.00</span>
              </div>
              <div className="insight-row">
                <span className="k">EARNING / YR</span>
                <span className="v green">$67.30</span>
              </div>
            </div>
          </div>
        </div>

        <div className="trusted-block">
          <div className="tb-label">Accepted at 100M+ merchants worldwide</div>
          <div className="trusted-marquee">
            <div className="trusted-track" id="trustedTrack">
              <span>Groceries</span>
              <span>Online shopping</span>
              <span>Dining</span>
              <span>Fuel</span>
              <span>Travel</span>
              <span>Subscriptions</span>
              <span>Pharmacies</span>
              <span>Transit</span>
            </div>
          </div>
        </div>
        <div className="hero-dots" aria-hidden="true">
          <i className="on"></i>
          <i></i>
          <i></i>
        </div>
      </header>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how">
        <div className="section-head reveal">
          <div className="section-kicker">How it works</div>
          <h2>
            Loaded, earning, spendable — in <span className="serif">minutes</span>
          </h2>
        </div>
        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <article className="step-card reveal" data-delay={i} key={s.no}>
              <div className="step-no">{s.no}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <div className="step-visual">
                <div className="mock">
                  {s.rows.map((r) => (
                    <div className="m-row" key={r.k}>
                      <span className="k">{r.k}</span>
                      <span className={'v' + (r.g ? ' g' : '')}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" style={{ paddingTop: 0 }}>
        <div className="section-head reveal">
          <div className="section-kicker">Why Hybrid Cash</div>
          <h2>
            Your money never <span className="serif">sleeps</span>
          </h2>
          <p>
            Most cards let you spend. Hybrid Cash lets you earn while you wait —
            then spend whenever you&apos;re ready. The &quot;hybrid&quot; is crypto
            and cash working as one.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <article className="feature-card reveal" data-delay={i} key={f.no}>
              <span className="f-no">{f.no}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ===== FEES ===== */}
      <section id="fees" style={{ paddingTop: 0 }}>
        <div className="section-head reveal">
          <div className="section-kicker">Fees &amp; yield</div>
          <h2>
            Simple fees. Real <span className="serif">yield</span>
          </h2>
          <p>
            One flat card fee, zero monthly charges, and your balance earns APY
            from the moment you load it. Every number is published — nothing
            hidden.
          </p>
        </div>
        <div className="fees-wrap reveal">
          <table className="fees-table">
            <tbody>
            <tr className="head">
              <td>Card</td>
              <td>Fee</td>
              <td style={{ textAlign: 'right' }}>Earns APY</td>
            </tr>
            {FEE_ROWS.map((r) => (
              <tr key={r.label}>
                <td className="row-label">
                  {r.label}
                  <span className="row-sub">{r.sub}</span>
                </td>
                <td className={'row-fee' + (r.g ? ' g' : '')}>{r.fee}</td>
                <td className={'row-total' + (r.apy === 'FREE' ? ' g' : '')}>
                  {r.apy}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
          <div className="fees-note">
            APY illustrative — variable, sourced from onchain lending rates. Final
            fee structure published at launch.
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" style={{ paddingTop: 0 }}>
        <div className="section-head reveal">
          <div className="section-kicker">FAQ</div>
          <h2>
            Questions, <span className="serif">answered</span>
          </h2>
        </div>
        <div className="faq-list reveal">
          {FAQS.map((f) => (
            <div className="faq-item" key={f.q}>
              <h3 className="faq-q">
                <button type="button" aria-expanded="false">
                  {f.q}
                </button>
              </h3>
              <div className="faq-a">
                <div className="faq-a-inner">
                  <p className="answer">{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section id="cta" style={{ paddingTop: 0 }}>
        <div className="cta-band reveal">
          <h2>
            Ready to put your crypto to <span className="serif">work?</span>
          </h2>
          <p>
            Load your wallet on Robinhood Chain, deposit any asset, and start
            earning before your first coffee. Spend when you&apos;re ready — your
            money stays busy until then.
          </p>
          <div className="cta-actions">
            <a className="btn-primary js-get-card" href="#home">
              START EARNING →
            </a>
            <a className="btn-ghost" href="#how">
              SEE HOW IT WORKS
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="site-footer" id="contact">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src="/assets/logo.svg" alt="Hybrid Cash" />
            <p>
              The spend card that earns. Load crypto on Robinhood Chain, earn
              yield while you wait, spend anywhere cards are accepted.
            </p>
            <a className="footer-social" href="https://x.com/" target="_blank" rel="noopener">
              ✕ &nbsp;@HybridCash
            </a>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#how">Load</a>
            <a href="#features">Earn</a>
            <a href="#fees">Fees &amp; yield</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="#contact">Terms of Service</a>
            <a href="#contact">Docs</a>
          </div>
        </div>
        <div className="footer-legal">
          © 2026 Hybrid Cash. All rights reserved. Hybrid Cash is a financial
          technology company, not a bank. Card balances are not bank deposits and
          are not insured. Yield is variable, sourced from onchain lending
          markets, and not guaranteed. Cards are issued by our issuing partner
          pursuant to applicable licenses. $HCASH token ticker subject to change.
        </div>
      </footer>

      {/* MODAL — static HTML, driven by vanilla JS */}
<div class="modal-overlay" id="cardModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
  <div class="modal">
    <div class="modal-head">
      <h3 id="modalTitle">Get your card</h3>
      <button class="modal-close" id="modalClose" aria-label="Close">✕</button>
    </div>
    <div class="modal-body" id="modalBody">
      
      <div class="modal-step" data-step="1">Step 1 / 3</div>
      <div class="modal-title">Deposit crypto to fund your card</div>
      <div class="modal-sub">Pick what you want to deposit. The card balance is funded the moment the transaction confirms onchain — no bank, no paperwork.</div>

      <div class="asset-options" id="assetOptions">
        <label class="asset-opt">
          <input type="radio" name="asset" value="USDG" checked>
          <span class="asset-sym">USDG</span>
          <span class="asset-name">Global Dollar</span>
          <span class="asset-badge">1:1</span>
        </label>
        <label class="asset-opt">
          <input type="radio" name="asset" value="ETH">
          <span class="asset-sym">ETH</span>
          <span class="asset-name">Ether</span>
          <span class="asset-badge">live</span>
        </label>
        <label class="asset-opt">
          <input type="radio" name="asset" value="WETH">
          <span class="asset-sym">WETH</span>
          <span class="asset-name">Wrapped Ether</span>
          <span class="asset-badge">live</span>
        </label>
      </div>

      <div class="amount-options" id="amountOptions">
        <div class="load-opt" data-amt="10"><div class="am">$10</div><div class="ap">min load</div></div>
        <div class="load-opt" data-amt="20"><div class="am">$20</div><div class="ap"></div></div>
        <div class="load-opt" data-amt="50"><div class="am">$50</div><div class="ap"></div></div>
        <div class="load-opt" data-amt="100"><div class="am">$100</div><div class="ap"></div></div>
        <div class="load-opt" data-amt="250"><div class="am">$250</div><div class="ap"></div></div>
      </div>

      <button class="modal-cta" id="modalNext" disabled>CONTINUE →</button>
      <div class="modal-note">One-time $5 card fee. Top-ups free. Network gas free.</div>
    </div>
  </div>
</div>

      <script dangerouslySetInnerHTML={__html: `(function(){
  // ===== Mobile menu =====
  var menuBtn = document.getElementById('menuBtn');
  var navLinks = document.getElementById('navLinks');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', function(){
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ navLinks.classList.remove('open'); });
    });
  }

  // ===== Nav scroll state =====
  var topnav = document.getElementById('topnav');
  function onScroll(){
    topnav.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // ===== FAQ accordion =====
  document.querySelectorAll('.faq-item').forEach(function(item){
    var btn = item.querySelector('.faq-q button');
    btn.addEventListener('click', function(){
      var isOpen = item.classList.contains('is-open');
      document.querySelectorAll('.faq-item.is-open').forEach(function(other){
        if (other !== item) {
          other.classList.remove('is-open');
          other.querySelector('.faq-q button').setAttribute('aria-expanded','false');
        }
      });
      item.classList.toggle('is-open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  // ===== Entrance motion (IntersectionObserver) =====
  document.documentElement.classList.add('motion-ready');
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, {threshold: 0.12, rootMargin: '0px 0px -6% 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  // ===== Marquee duplicate =====
  var track = document.getElementById('trustedTrack');
  if (track) {
    track.innerHTML += track.innerHTML;
  }

  // ===== Get Card Modal (REAL CHECKOUT) =====
  var modal = document.getElementById('cardModal');
  var modalBody = document.getElementById('modalBody');
  var modalClose = document.getElementById('modalClose');
  var API = window.HC_API_BASE || (location.protocol + '//' + location.hostname + ':4190');
  var selectedAsset = 'USDG';
  var selectedAmt = null;
  var quoteData = null;

  // Open modal from any .js-get-card click
  document.querySelectorAll('.js-get-card').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      openModal();
    });
  });
  // Also nav links that say "Start"
  document.querySelectorAll('.nav-links a[href="#cta"], .nav-cta').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      openModal();
    });
  });

  function openModal(){
    resetModal();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    modal.classList.remove('open');
    document.body.style.overflow = '';
    resetModal();
  }

  function resetModal(){
    selectedAsset = 'USDG';
    selectedAmt = null;
    quoteData = null;
    renderStep1();
    rebindStep1();
  }

  function renderStep1(){
    modalBody.innerHTML =
      '<div class="modal-step" data-step="1">Step 1 / 3</div>' +
      '<div class="modal-title">Deposit crypto to fund your card</div>' +
      '<div class="modal-sub">Pick what you want to deposit. The card balance is funded the moment the transaction confirms onchain.</div>' +
      '<div class="asset-options" id="assetOptions">' +
        '<label class="asset-opt' + (selectedAsset==='USDG'?' sel':'') + '"><input type="radio" name="asset" value="USDG"' + (selectedAsset==='USDG'?' checked':'') + '><span class="asset-sym">USDG</span><span class="asset-name">Global Dollar</span><span class="asset-badge">1:1</span></label>' +
        '<label class="asset-opt' + (selectedAsset==='ETH'?' sel':'') + '"><input type="radio" name="asset" value="ETH"' + (selectedAsset==='ETH'?' checked':'') + '><span class="asset-sym">ETH</span><span class="asset-name">Ether</span><span class="asset-badge">live</span></label>' +
        '<label class="asset-opt' + (selectedAsset==='WETH'?' sel':'') + '"><input type="radio" name="asset" value="WETH"' + (selectedAsset==='WETH'?' checked':'') + '><span class="asset-sym">WETH</span><span class="asset-name">Wrapped Ether</span><span class="asset-badge">live</span></label>' +
      '</div>' +
      '<div class="amount-options" id="amountOptions">' +
        '<div class="load-opt" data-amt="10"><div class="am">$10</div><div class="ap">min load</div></div>' +
        '<div class="load-opt" data-amt="20"><div class="am">$20</div><div class="ap"></div></div>' +
        '<div class="load-opt" data-amt="50"><div class="am">$50</div><div class="ap"></div></div>' +
        '<div class="load-opt" data-amt="100"><div class="am">$100</div><div class="ap"></div></div>' +
        '<div class="load-opt" data-amt="250"><div class="am">$250</div><div class="ap"></div></div>' +
      '</div>' +
      '<button class="modal-cta" id="modalNext" disabled>CONTINUE →</button>' +
      '<div class="modal-note">One-time $5 card fee. Top-ups free. Network gas free.</div>';
  }

  function rebindStep1(){
    // asset selection
    document.querySelectorAll('.asset-opt input').forEach(function(input){
      input.addEventListener('change', function(){
        selectedAsset = input.value;
        document.querySelectorAll('.asset-opt').forEach(function(l){
          l.classList.toggle('sel', l.querySelector('input').checked);
        });
      });
    });
    // amount selection
    document.querySelectorAll('#amountOptions .load-opt').forEach(function(o){
      o.addEventListener('click', function(){
        document.querySelectorAll('#amountOptions .load-opt').forEach(function(x){ x.classList.remove('sel'); });
        o.classList.add('sel');
        selectedAmt = o.getAttribute('data-amt');
        document.getElementById('modalNext').disabled = false;
      });
    });
    document.getElementById('modalNext').addEventListener('click', showStep2);
    document.getElementById('modalClose').addEventListener('click', closeModal);
  }

  function showStep2(){
    modalBody.innerHTML =
      '<div class="modal-step" data-step="2">Step 2 / 3</div>' +
      '<div class="modal-title">Connect your wallet</div>' +
      '<div class="modal-sub">Connect the wallet holding your ' + selectedAsset + ' on Robinhood Chain to continue.</div>' +
      '<button class="modal-cta" id="modalConnect">CONNECT WALLET →</button>' +
      '<div class="modal-note">We\'ll never move funds without your explicit signature.</div>';
    document.getElementById('modalConnect').addEventListener('click', connectAndQuote);
    document.getElementById('modalClose').addEventListener('click', closeModal);
  }

  async function connectAndQuote(){
    var btn = document.getElementById('modalConnect');
    btn.disabled = true;
    btn.textContent = 'REQUESTING QUOTE…';
    try {
      if (!window.ethereum) {
        modalBody.innerHTML = '<div class="modal-title">No wallet detected</div><div class="modal-sub">Install a wallet that supports Robinhood Chain (e.g. Rabby, MetaMask) and connect it.</div><button class="modal-cta" id="modalRetry">RETRY</button>';
        document.getElementById('modalRetry').addEventListener('click', showStep2);
        return;
      }
      // request accounts
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      // ensure chain 4663 — check first, switch only if needed
      var curChain = '0x0';
      try { curChain = await window.ethereum.request({ method: 'eth_chainId' }); } catch (e2) {}
      if (curChain !== '0x1237') {
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1237' }] });
        } catch (e) {
          if (e && (e.code === 4902 || String(e.message||'').indexOf('4902') !== -1)) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x1237',
                  chainName: 'Robinhood Chain',
                  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
                  blockExplorerUrls: ['https://robinhoodchain.blockscout.com'],
                }],
              });
              await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1237' }] });
            } catch (e2) {
              // auto-add failed — give manual instructions instead of raw wallet error
              modalBody.innerHTML =
                '<div class="modal-title">Add Robinhood Chain manually</div>' +
                '<div class="modal-sub">Your wallet could not switch automatically. Add the network manually, then press retry.</div>' +
                '<div class="pay-summary"><div class="pay-row"><span class="k">Chain ID</span><span class="v mono">4663</span></div><div class="pay-row"><span class="k">RPC</span><span class="v mono" style="font-size:11px">rpc.mainnet.chain.robinhood.com</span></div></div>' +
                '<button class="modal-cta" id="modalRetry">RETRY</button>';
              document.getElementById('modalRetry').addEventListener('click', function(){ showStep2(); });
              return;
            }
          } else {
            // unknown switch error — surface cleanly
            modalBody.innerHTML =
              '<div class="modal-title">Could not switch chain</div>' +
              '<div class="modal-sub" style="color:var(--red)">' + escapeHtml(e.message || String(e)) + '</div>' +
              '<button class="modal-cta" id="modalRetry">RETRY</button>';
            document.getElementById('modalRetry').addEventListener('click', function(){ showStep2(); });
            return;
          }
        }
      }

      // fetch quote from backend
      btn.textContent = 'GENERATING QUOTE…';
      var res = await fetch(API + '/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ asset: selectedAsset, amountUsd: Number(selectedAmt) }),
      });
      var quote = await res.json();
      if (!res.ok) throw new Error(quote.error || 'Could not create a quote');
      quoteData = quote;

      renderStep3();
    } catch (e) {
      modalBody.innerHTML =
        '<div class="modal-title">Something went wrong</div>' +
        '<div class="modal-sub" style="color:var(--red)">' + escapeHtml(e.message) + '</div>' +
        '<button class="modal-cta" id="modalRetry">RETRY</button>';
      document.getElementById('modalRetry').addEventListener('click', function(){ showStep2(); });
    }
  }

  function renderStep3(){
    var q = quoteData;
    var display = Number(q.displayUnits) >= 0.001
      ? q.displayUnits + ' ' + q.symbol
      : (Number(q.totalUsd) / Number(q.priceUsd)).toFixed(6) + ' ' + q.symbol;
    var feeLine = Number(q.feeUsd) > 0
      ? '<div class="pay-row"><span class="k">Card fee</span><span class="v">$' + Number(q.feeUsd).toFixed(2) + '</span></div>'
      : '<div class="pay-row"><span class="k">Card fee</span><span class="v g">FREE</span></div>';
    modalBody.innerHTML =
      '<div class="modal-step" data-step="3">Step 3 / 3 — Review & pay</div>' +
      '<div class="modal-title">Confirm your deposit</div>' +
      '<div class="modal-sub">You\'re depositing crypto to the Hybrid Cash treasury. Review the amount, then approve in your wallet.</div>' +
      '<div class="pay-summary">' +
        '<div class="pay-row"><span class="k">Load</span><span class="v">$' + Number(q.amountUsd).toFixed(2) + '</span></div>' +
        feeLine +
        '<div class="pay-row"><span class="k">Total</span><span class="v">' + display + '</span></div>' +
        '<div class="pay-row"><span class="k">Treasury</span><span class="v mono">' + shortAddr(q.to) + '</span></div>' +
        '<div class="pay-row"><span class="k">Chain</span><span class="v">Robinhood (4663)</span></div>' +
      '</div>' +
      '<button class="modal-cta" id="modalPay">PAY ' + display + '</button>' +
      '<button class="modal-back" id="modalBack">← Back</button>' +
      '<div class="modal-note">Transaction is pre-filled — you approve it in your wallet. Nothing is moved without your signature.</div>';
    document.getElementById('modalPay').addEventListener('click', payAndConfirm);
    document.getElementById('modalBack').addEventListener('click', function(){ resetModal(); });
    document.getElementById('modalClose').addEventListener('click', closeModal);
  }

  async function payAndConfirm(){
    var btn = document.getElementById('modalPay');
    btn.disabled = true;
    btn.textContent = 'WAITING FOR YOUR WALLET…';
    try {
      var q = quoteData;
      var from = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];

      // send transaction
      var tx;
      if (q.token_address) {
        // ERC20 transfer to treasury
        var data = encodeTransfer(q.token_address, q.to, q.units);
        tx = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: from,
            to: q.token_address,
            data: data,
          }],
        });
      } else {
        // native ETH
        tx = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from: from, to: q.to, value: '0x' + BigInt(q.units).toString(16) }],
        });
      }

      btn.textContent = 'PAYMENT SENT — VERIFYING…';
      renderWaiting(tx);
      // poll backend confirm
      var ok = false;
      for (var i = 0; i < 30; i++) {
        await sleep(2000);
        var res = await fetch(API + '/api/confirm', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ intent: q.intent, txHash: tx }),
        });
        var data = await res.json();
        if (data.status === 'done') { ok = true; renderSuccess(data, tx); break; }
        if (data.status === 'expired') break;
      }
      if (!ok) {
        renderWaiting(tx, true);
      }
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'PAY ' + (quoteData ? quoteData.displayUnits + ' ' + quoteData.symbol : '');
      modalBody.innerHTML =
        '<div class="modal-title">Transaction failed</div>' +
        '<div class="modal-sub" style="color:var(--red)">' + escapeHtml(e.message) + '</div>' +
        '<button class="modal-cta" id="modalRetry">TRY AGAIN</button>';
      document.getElementById('modalRetry').addEventListener('click', function(){ renderStep3(); });
    }
  }

  function renderWaiting(tx, timedOut){
    modalBody.innerHTML =
      '<div class="modal-success">' +
        '<div class="spinner" aria-hidden="true"></div>' +
        '<h3>' + (timedOut ? 'Still verifying…' : 'Verifying your payment') + '</h3>' +
        '<p>' + (timedOut ? 'Your transaction was sent and is safe. It\'s taking a little longer than usual to confirm onchain.' : 'Waiting for the network to confirm your deposit. This usually takes a few seconds.') + '</p>' +
        '<div class="ref">' + shortAddr(tx) + '</div>' +
        (timedOut ? '<button class="modal-cta" id="modalCheck" style="margin-top:16px">CHECK AGAIN</button>' : '') +
      '</div>';
    if (timedOut) {
      document.getElementById('modalCheck').addEventListener('click', function(){
        renderWaiting(tx, false);
        setTimeout(function(){
          fetch(API + '/api/confirm', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ intent: quoteData.intent, txHash: tx }),
          }).then(function(r){ return r.json(); }).then(function(data){
            if (data.status === 'done') renderSuccess(data, tx);
          }).catch(function(){});
        }, 3000);
      });
    }
    document.getElementById('modalClose').addEventListener('click', closeModal);
  }

  function renderSuccess(data, tx){
    modalBody.innerHTML =
      '<div class="modal-success">' +
        '<div class="check">✓</div>' +
        '<h3>Your card is funded!</h3>' +
        '<p>Deposit confirmed onchain. Your Hybrid Cash card balance is being issued now — check your email / dashboard shortly.</p>' +
        '<div class="ref">' + (data.cardId || 'card_ready') + '</div>' +
        '<button class="modal-cta" id="modalDone" style="margin-top:16px">DONE</button>' +
      '</div>';
    document.getElementById('modalDone').addEventListener('click', closeModal);
    document.getElementById('modalClose').addEventListener('click', closeModal);
  }

  // minimal ERC20 transfer encoding (function transfer(address,uint256))
  function encodeTransfer(tokenAddr, to, units){
    var methodId = 'a9059cbb';
    var toHex = to.slice(2).toLowerCase().padStart(64, '0');`} />
    </>
  );
}
