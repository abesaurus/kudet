(function(){
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
  var dashView = document.getElementById('dashView');
  var dashBody = document.getElementById('dashBody');
  var dashClose = document.getElementById('dashClose');
  var dashAddr = document.getElementById('dashAddr');
  var dashLogo = document.getElementById('dashLogo');
  var API = window.HC_API_BASE || (location.protocol + '//' + location.hostname + ':4190');
  var selectedAsset = 'USDG';
  var selectedAmt = null;
  var quoteData = null;
  var isTopup = false;
  var userData = null;
  var cardData = null;
  var cards = [];
  var cvvRevealed = false;

  // Load saved user session (wallet address + signature)
  try {
    var saved = localStorage.getItem('hc_user');
    if (saved) userData = JSON.parse(saved);
  } catch (e) {}
  // Load issued cards (multi-card)
  try {
    var savedCards = localStorage.getItem('hc_cards');
    if (savedCards) {
      var parsed = JSON.parse(savedCards);
      if (Array.isArray(parsed)) cards = parsed;
    }
  } catch (e) {}
  // Back-compat: if only the legacy single-card key exists, migrate it
  try {
    if (cards.length === 0) {
      var legacy = localStorage.getItem('hc_card');
      if (legacy) {
        var c = JSON.parse(legacy);
        cards.push(c);
        localStorage.setItem('hc_cards', JSON.stringify(cards));
      }
    }
  } catch (e) {}
  cardData = cards.length ? cards[0] : null;

  // Open modal from any .js-get-card click
  document.querySelectorAll('.js-get-card').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      openModal();
    });
  });
  // Also nav links that say "Get Card"
  document.querySelectorAll('.nav-links a[href="#cta"], .nav-cta').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      openModal();
    });
  });

  // My Card — opens the full-screen dashboard. If user has no card yet,
  // dashboard shows an empty state that routes them into the create flow.
  document.querySelectorAll('.js-my-card').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      openDashboard();
    });
  });

  function openModal(mode){
    resetModal(mode || '');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    modal.classList.remove('open');
    document.body.style.overflow = '';
    resetModal('');
  }

  // mode: '' = default (existing card → show card, else sign in/deposit)
  //       'new' = force the create-a-card deposit flow
  //       'topup' = force top-up flow for the active card
  function resetModal(mode){
    selectedAsset = 'USDG';
    selectedAmt = null;
    quoteData = null;
    isTopup = false;
    if (mode === 'new') {
      isTopup = false;
      if (userData && userData.address) { renderStep2(); return; }
      renderStep1();
      return;
    }
    if (mode === 'topup') {
      isTopup = true;
      renderStep2();
      return;
    }
    // default: if user already has an issued card, show it first
    if (cardData) {
      renderMyCard();
    } else if (userData && userData.address) {
      renderStep2();
    } else {
      renderStep1();
    }
  }

  // ============ STEP 1 — Connect wallet + Sign in ============
  function renderStep1(){
    modalBody.innerHTML =
      '<div class="modal-step" data-step="1">Step 1 / 3</div>' +
      '<div class="modal-title">Connect your wallet</div>' +
      '<div class="modal-sub">Connect your wallet and sign a message to verify you own it. We save your address so your card is linked to your account.</div>' +
      '<button class="modal-cta" id="modalConnect">CONNECT WALLET →</button>' +
      '<div class="modal-note">Signing is free — no gas, no transaction. Just a secure signature to create your Hybrid Cash account.</div>';
    document.getElementById('modalConnect').addEventListener('click', connectAndSignIn);
    document.getElementById('modalClose').addEventListener('click', closeModal);
  }

  async function connectAndSignIn(){
    var btn = document.getElementById('modalConnect');
    btn.disabled = true;
    btn.textContent = 'CONNECTING…';
    try {
      if (!window.ethereum) {
        modalBody.innerHTML = '<div class="modal-title">No wallet detected</div><div class="modal-sub">Install a wallet that supports Robinhood Chain (e.g. Rabby, MetaMask) and connect it.</div><button class="modal-cta" id="modalRetry">RETRY</button>';
        document.getElementById('modalRetry').addEventListener('click', renderStep1);
        return;
      }
      // request accounts
      var accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      var address = accounts[0];

      // ensure chain 4663 — check first, switch only if needed
      btn.textContent = 'SWITCHING CHAIN…';
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
              document.getElementById('modalRetry').addEventListener('click', function(){ renderStep1(); });
              return;
            }
          } else {
            // unknown switch error — surface cleanly
            modalBody.innerHTML =
              '<div class="modal-title">Could not switch chain</div>' +
              '<div class="modal-sub" style="color:var(--red)">' + escapeHtml(e.message || String(e)) + '</div>' +
              '<button class="modal-cta" id="modalRetry">RETRY</button>';
            document.getElementById('modalRetry').addEventListener('click', function(){ renderStep1(); });
            return;
          }
        }
      }

      // sign in — message signature proves ownership, no gas
      btn.textContent = 'SIGNING…';
      var msg = 'Hybrid Cash — sign in\n\nWallet: ' + address + '\nTimestamp: ' + Date.now();
      var sig = await window.ethereum.request({
        method: 'personal_sign',
        params: [msg, address],
      });

      // save user data locally
      userData = { address: address, signedAt: Date.now(), signature: sig };
      try { localStorage.setItem('hc_user', JSON.stringify(userData)); } catch (e3) {}

      // save to backend (best effort)
      try {
        fetch(API + '/api/user', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ address: address, signedAt: userData.signedAt, signature: sig }),
        });
      } catch (e4) {}

      renderStep2();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'CONNECT WALLET →';
      modalBody.innerHTML =
        '<div class="modal-title">Sign in failed</div>' +
        '<div class="modal-sub" style="color:var(--red)">' + escapeHtml(e.message) + '</div>' +
        '<button class="modal-cta" id="modalRetry">RETRY</button>';
      document.getElementById('modalRetry').addEventListener('click', function(){ renderStep1(); });
    }
  }

  // ============ STEP 2 — Choose asset & amount ============
  function renderStep2(){
    var who = userData && userData.address ? '<div class="wallet-chip">✓ ' + shortAddr(userData.address) + '</div>' : '';
    var depTitle = isTopup ? 'Top up your card' : 'Deposit to fund your card';
    modalBody.innerHTML =
      who +
      '<div class="modal-step" data-step="2">Step 2 / 3</div>' +
      '<div class="modal-title">' + depTitle + '</div>' +
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

    rebindStep2();
  }

  function rebindStep2(){
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
    document.getElementById('modalNext').addEventListener('click', getQuote);
    document.getElementById('modalClose').addEventListener('click', closeModal);
  }

  // ============ QUOTE (wallet already connected) ============
  async function getQuote(){
    var btn = document.getElementById('modalNext');
    btn.disabled = true;
    btn.textContent = 'GENERATING QUOTE…';
    try {
      // fetch quote from backend
      var res = await fetch(API + '/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ asset: selectedAsset, amountUsd: Number(selectedAmt), kind: isTopup ? 'topup' : 'issue' }),
      });
      var quote = await res.json();
      if (!res.ok) throw new Error(quote.error || 'Could not create a quote');
      quoteData = quote;
      renderStep3();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'CONTINUE →';
      modalBody.innerHTML =
        '<div class="modal-title">Something went wrong</div>' +
        '<div class="modal-sub" style="color:var(--red)">' + escapeHtml(e.message) + '</div>' +
        '<button class="modal-cta" id="modalRetry">RETRY</button>';
      document.getElementById('modalRetry').addEventListener('click', function(){ renderStep2(); });
    }
  }

  // ============ STEP 3 — Review & pay ============
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
    // build + persist the issued virtual card
    var card;
    var added = quoteData ? (Number(quoteData.amountUsd) + Number(quoteData.feeUsd || 0)) : 0;
    if (isTopup && cardData) {
      // top-up: keep the same card, add funds to its balance
      card = cardData;
      card.balanceUsd = Number(card.balanceUsd || 0) + (quoteData ? Number(quoteData.amountUsd || 0) : 0);
      card.issuedAt = Date.now();
    } else {
      // new card: fresh balance = deposit + one-time fee
      card = buildCard(data.cardId || ('card_' + Date.now().toString(36)));
      card.balanceUsd = added;
    }
    saveCard(card);
    modalBody.innerHTML =
      '<div class="modal-success">' +
        '<div class="check">✓</div>' +
        '<h3>' + (isTopup ? 'Card topped up!' : 'Your card is ready!') + '</h3>' +
        '<p>' + (isTopup ? 'Deposit confirmed onchain. Your card balance has been updated.' : 'Deposit confirmed onchain. Your Hybrid Cash virtual card is issued and funded.') + '</p>' +
        cardHtml(card) +
        '<button class="modal-cta" id="modalViewCard" style="margin-top:16px">VIEW CARD</button>' +
        '<button class="modal-back" id="modalDone">Done</button>' +
      '</div>';
    document.getElementById('modalViewCard').addEventListener('click', function(){ closeModal(); openDashboard(); });
    document.getElementById('modalDone').addEventListener('click', closeModal);
    document.getElementById('modalClose').addEventListener('click', closeModal);
  }

  // ============ MY CARD — view issued card ============
  function renderMyCard(){
    if (!cardData) { renderStep1(); return; }
    var bal = Number(cardData.balanceUsd || 0).toFixed(2);
    modalBody.innerHTML =
      '<div class="modal-step" data-step="card">Your card</div>' +
      '<div class="modal-title">Virtual card — ready to spend</div>' +
      '<div class="modal-sub">Your balance earns yield until you swipe. Add funds anytime.</div>' +
      cardHtml(cardData) +
      '<div class="pay-summary">' +
        '<div class="pay-row"><span class="k">Balance</span><span class="v">$' + bal + '</span></div>' +
        '<div class="pay-row"><span class="k">Card</span><span class="v mono">' + cardData.number.slice(0,4) + ' •••• •••• ' + cardData.number.slice(-4) + '</span></div>' +
        '<div class="pay-row"><span class="k">Expiry</span><span class="v mono">' + cardData.expiry + '</span></div>' +
      '</div>' +
      '<button class="modal-cta" id="modalTopup">TOP UP →</button>' +
      '<button class="modal-back" id="modalBack">Close</button>';
    document.getElementById('modalTopup').addEventListener('click', function(){ isTopup = true; renderStep2(); });
    document.getElementById('modalBack').addEventListener('click', closeModal);
    document.getElementById('modalClose').addEventListener('click', closeModal);
  }

  // deterministic card from seed (cardId) so it's stable per issuance
  function buildCard(seed){
    var h = 0;
    var s = String(seed) + (userData ? userData.address : '');
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    function next(n){
      h = (h * 1103515245 + 12345) >>> 0;
      return h % n;
    }
    var num = '';
    for (var j = 0; j < 16; j++) num += String(next(10));
    var now = new Date();
    var exp = ('0' + ((now.getMonth() + 1) + next(4)) % 12).slice(-2) + '/' + String((now.getFullYear() + 3) % 100);
    var cvv = '';
    var xv = h;
    for (var ci = 0; ci < 3; ci++) { xv = (xv * 1664525 + 1013904223) >>> 0; cvv += String(xv % 10); }
    return {
      number: num,
      expiry: exp,
      cvv: cvv,
      balanceUsd: 0,
      cardId: seed,
      issuedAt: Date.now(),
    };
  }

  function saveCard(card){
    // upsert into the cards array, keep active card
    var exists = false;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].cardId === card.cardId) { cards[i] = card; exists = true; break; }
    }
    if (!exists) cards.push(card);
    cardData = card;
    try {
      localStorage.setItem('hc_cards', JSON.stringify(cards));
      localStorage.setItem('hc_card', JSON.stringify(card));
    } catch (e) {}
  }

  function setActiveCard(cardId){
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].cardId === cardId) { cardData = cards[i]; break; }
    }
    cvvRevealed = false;
    try { localStorage.setItem('hc_card', JSON.stringify(cardData)); } catch (e) {}
    renderDashboard();
  }

  function cardHtml(c){
    return '<div class="issued-card">' +
      '<div class="ic-brand"><span class="word">HYBRID<em>CASH</em></span><span class="ticker">VIRTUAL</span></div>' +
      '<div class="chip"></div>' +
      '<div class="ic-num">' + c.number.replace(/(.{4})/g, '$1 ') + '</div>' +
      '<div class="ic-foot">' +
        '<div><div class="lbl">Expiry</div><div class="val">' + c.expiry + '</div></div>' +
        '<div><div class="lbl">CVV</div><div class="val">•••</div></div>' +
      '</div>' +
    '</div>';
  }

  // ============ DASHBOARD (FULL SCREEN) ============
  function openDashboard(){
    cvvRevealed = false;
    if (userData && userData.address) {
      dashAddr.textContent = shortAddr(userData.address);
      dashAddr.style.display = 'inline-block';
    } else {
      dashAddr.style.display = 'none';
    }
    renderDashboard();
    dashView.classList.add('open');
    document.body.style.overflow = 'hidden';
    dashView.scrollTop = 0;
  }

  function closeDashboard(){
    dashView.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderDashboard(){
    if (!cardData) {
      renderDashboardEmpty();
      return;
    }
    var c = cardData;
    var bal = Number(c.balanceUsd || 0).toFixed(2);
    var apyEarn = (Number(c.balanceUsd || 0) * 0.054).toFixed(2);
    var issued = new Date(c.issuedAt || Date.now());
    var issuedStr = issued.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // card switcher chips (all issued cards) + ADD CARD
    var chips = '';
    for (var i = 0; i < cards.length; i++) {
      var cc = cards[i];
      var active = cc.cardId === c.cardId ? ' active' : '';
      chips += '<div class="dash-card-chip' + active + '" data-card="' + cc.cardId + '">' +
        '<span class="dot"></span>•••• ' + cc.number.slice(-4) +
        ' <span class="bal">$' + Number(cc.balanceUsd || 0).toFixed(0) + '</span></div>';
    }
    chips += '<div class="dash-card-chip add" id="dashAddCard">+ ADD CARD</div>';

    dashBody.innerHTML =
      '<div class="dash-cards">' + chips + '</div>' +
      '<div class="dash-hero">' +
        '<div class="dash-hero-left">' +
          '<div class="dash-hero-label">Available balance <em>· earning</em></div>' +
          '<div class="dash-balance">$' + bal + '<small> USD</small></div>' +
          '<div class="dash-balance-sub">Earning <span class="apy">5.4% APY</span> · yield pauses when you spend · issued ' + issuedStr + '</div>' +
          '<div class="dash-hero-stats">' +
            '<div class="hs"><div class="num">5.4%</div><div class="lbl">APY</div></div>' +
            '<div class="hs"><div class="num">+$' + apyEarn + '</div><div class="lbl">Earning / yr</div></div>' +
            '<div class="hs"><div class="num">' + c.number.slice(-4) + '</div><div class="lbl">Card</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="dash-hero-right">' + cardHtml(c) + '</div>' +
      '</div>' +
      '<div class="dash-grid">' +
        '<div class="dash-panel">' +
          '<h4>Card details <span class="link" id="dashCopy">copy</span></h4>' +
          '<div class="detail-grid">' +
            '<div class="detail-cell span2"><div class="k">Card number</div><div class="v" id="dNum">' + c.number + '</div></div>' +
            '<div class="detail-cell"><div class="k">Expiry</div><div class="v">' + c.expiry + '</div></div>' +
            '<div class="detail-cell"><div class="k">CVV</div><div class="v"><span id="dCvv">' + (cvvRevealed ? c.cvv : '•••') + '</span> <button class="cvv-toggle" id="dCvvToggle">' + (cvvRevealed ? 'HIDE' : 'SHOW') + '</button></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="dash-panel">' +
          '<h4>Card status</h4>' +
          '<div class="act-item"><div class="a-left"><div class="act-icon green">✓</div><div><div class="a-title">Active</div><div class="a-sub">Ready to spend</div></div></div><div class="a-amt green">LIVE</div></div>' +
          '<div class="act-item"><div class="a-left"><div class="act-icon ink">%</div><div><div class="a-title">Earning yield</div><div class="a-sub">Compounding daily</div></div></div><div class="a-amt green">5.4%</div></div>' +
          '<div class="act-item"><div class="a-left"><div class="act-icon ink">🛡</div><div><div class="a-title">Fraud protection</div><div class="a-sub">On by default</div></div></div><div class="a-amt gray">ON</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-actions">' +
        '<button class="modal-cta" id="dashTopup">TOP UP →</button>' +
        '<button class="btn-ghost" id="dashViewModal">VIEW CARD</button>' +
      '</div>';

    // bind — switch active card
    var chipsEls = document.querySelectorAll('.dash-card-chip[data-card]');
    for (var ci = 0; ci < chipsEls.length; ci++) {
      chipsEls[ci].addEventListener('click', (function(cardId){ return function(){ setActiveCard(cardId); }; })(chipsEls[ci].getAttribute('data-card')));
    }
    var addBtn = document.getElementById('dashAddCard');
    if (addBtn) addBtn.addEventListener('click', function(){
      closeDashboard();
      openModal('new');
    });

    // bind — CVV reveal
    var cvvT = document.getElementById('dCvvToggle');
    if (cvvT) cvvT.addEventListener('click', function(){
      cvvRevealed = !cvvRevealed;
      var el = document.getElementById('dCvv');
      el.textContent = cvvRevealed ? c.cvv : '•••';
      cvvT.textContent = cvvRevealed ? 'HIDE' : 'SHOW';
    });
    var copy = document.getElementById('dashCopy');
    if (copy) copy.addEventListener('click', function(){
      var t = c.number + '\n' + c.expiry + '\nCVV ' + c.cvv;
      try { navigator.clipboard.writeText(t); copy.textContent = 'copied ✓'; setTimeout(function(){ copy.textContent = 'copy'; }, 1800); } catch (e) {}
    });
    var topup = document.getElementById('dashTopup');
    if (topup) topup.addEventListener('click', function(){ closeDashboard(); openModal('topup'); });
    var vm = document.getElementById('dashViewModal');
    if (vm) vm.addEventListener('click', function(){ closeDashboard(); openModal(); });
  }

  function renderDashboardEmpty(){
    var who = userData && userData.address ? '<p class="dash-empty-note">Signed in as ' + shortAddr(userData.address) + ' — no card yet.</p>' : '';
    dashBody.innerHTML =
      '<div class="dash-empty">' +
        '<div class="de-icon">💳</div>' +
        '<h2>You don\'t have a card yet</h2>' +
        '<p>Create your Hybrid Cash card — connect your wallet, deposit crypto on Robinhood Chain, and start earning yield on every dollar.</p>' +
        '<button class="modal-cta" id="dashCreateCard">CREATE YOUR CARD</button>' +
        who +
      '</div>';
    document.getElementById('dashCreateCard').addEventListener('click', function(){
      closeDashboard();
      openModal();
    });
  }

  dashClose.addEventListener('click', closeDashboard);
  if (dashLogo) dashLogo.addEventListener('click', closeDashboard);
  dashView.addEventListener('click', function(e){ if (e.target === dashView) closeDashboard(); });

  // minimal ERC20 transfer encoding (function transfer(address,uint256))
  function encodeTransfer(tokenAddr, to, units){
    var methodId = 'a9059cbb';
    var toHex = to.slice(2).toLowerCase().padStart(64, '0');
    var amtHex = BigInt(units).toString(16).padStart(64, '0');
    return '0x' + methodId + toHex + amtHex;
  }

  function shortAddr(a){
    return a.slice(0, 6) + '…' + a.slice(-4);
  }
  function escapeHtml(s){
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

  // Close on overlay click + escape
  modal.addEventListener('click', function(e){
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      if (modal.classList.contains('open')) closeModal();
      else if (dashView.classList.contains('open')) closeDashboard();
    }
  });
})();
