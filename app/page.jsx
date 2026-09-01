'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ThreeBackground from '../components/ThreeBackground';

const RH_CHAIN = {
  chainId: '0x1237',
  chainName: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
  blockExplorerUrls: ['https://robinscan.io'],
};

const PAGES = ['overview', 'borrow', 'repay', 'analytics', 'docs'];

const fmt = (n, dp = 2) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });

export default function Page() {
  // ── page + ui state ──
  const [page, setPage] = useState('overview');
  const [navOpen, setNavOpen] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState('activity');

  // ── wallet ──
  const [walletAddress, setWalletAddress] = useState(null);

  // ── data ──
  const [vault, setVault] = useState(null);
  const [pos, setPos] = useState(null);

  // ── form state ──
  const [borrowInput, setBorrowInput] = useState('0.00');
  const [borrowAsset, setBorrowAsset] = useState('HYBRID');
  const [borrowCalc, setBorrowCalc] = useState({ receive: '0.00', fee: '—', maxline: '—', ltv: '0%' });
  const [repayInput, setRepayInput] = useState('0.00');
  const [repayCalc, setRepayCalc] = useState({ redeem: '0.00', remDebt: '0 USDG', remColl: '0 HYBRID' });
  const [busy, setBusy] = useState(false);

  const inputRefs = useRef({});

  const api = useCallback(async (path, opts) => {
    const res = await fetch('/api' + path, {
      headers: { 'Content-Type': 'application/json' },
      ...(opts || {}),
    });
    return res.json();
  }, []);

  // ── vault refresh ──
  const refreshVault = useCallback(async () => {
    try {
      const v = await api('/vault');
      setVault(v);
    } catch (e) {
      console.warn('Vault fetch failed', e);
    }
  }, [api]);

  // ── position refresh ──
  const refreshPosition = useCallback(async () => {
    if (!walletAddress) {
      setPos(null);
      setBorrowCalc({ receive: '0.00', fee: '—', maxline: '—', ltv: '0%' });
      setRepayCalc({ redeem: '0.00', remDebt: '0 USDG', remColl: '0 HYBRID' });
      return;
    }
    try {
      const p = await api('/position/' + walletAddress);
      setPos(p);
    } catch (e) {
      console.warn('Position fetch failed', e);
    }
  }, [api, walletAddress]);

  // initial load + poll
  useEffect(() => {
    refreshVault();
    const t = setInterval(refreshVault, 15000);
    return () => clearInterval(t);
  }, [refreshVault]);

  useEffect(() => {
    if (walletAddress) refreshPosition();
  }, [walletAddress, refreshPosition]);

  // ── borrow live calc ──
  const recalcBorrow = useCallback(
    async (raw) => {
      const amt = parseFloat(String(raw || borrowInput).replace(/,/g, '')) || 0;
      if (amt <= 0) {
        setBorrowCalc({ receive: '0.00', fee: '—', maxline: '—', ltv: '0%' });
        return;
      }
      try {
        const v = await api('/vault');
        const price = v.protectedPrice;
        const collValue = amt * price;
        const grossDebt = Math.min(collValue * 0.5, Math.max(0, v.debtCap - v.debtOutstanding));
        const fee = grossDebt * 0.03;
        const netUsdg = grossDebt - fee;
        setBorrowCalc({
          receive: netUsdg.toFixed(2),
          fee: fee.toFixed(2) + ' USDG',
          maxline: grossDebt.toFixed(2) + ' USDG',
          ltv: (collValue > 0 ? (grossDebt / collValue) * 100 : 0).toFixed(1) + '%',
        });
      } catch (e) {
        console.warn(e);
      }
    },
    [api, borrowInput]
  );

  // ── repay live calc ──
  const recalcRepay = useCallback(
    async (raw) => {
      const amt = parseFloat(String(raw || repayInput).replace(/,/g, '')) || 0;
      if (amt <= 0 || !walletAddress) {
        setRepayCalc({ redeem: '0.00', remDebt: '0 USDG', remColl: '0 HYBRID' });
        return;
      }
      try {
        const p = await api('/position/' + walletAddress);
        const coll = p.collateral || 0;
        const debt = p.debt || 0;
        if (debt <= 0) return;
        const applied = Math.min(amt, debt);
        const collateralOut = coll * (applied / debt);
        setRepayCalc({
          redeem: collateralOut.toFixed(4),
          remDebt: (debt - applied).toFixed(2) + ' USDG',
          remColl: (coll - collateralOut).toFixed(4) + ' HYBRID',
        });
      } catch (e) {
        console.warn(e);
      }
    },
    [api, repayInput, walletAddress]
  );

  // ── wallet connect ──
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('No wallet detected. Install Rabby or MetaMask.');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts[0]) return;
      const addr = accounts[0];
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== RH_CHAIN.chainId) {
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: RH_CHAIN.chainId }] });
        } catch (e) {
          if (e.code === 4902) {
            await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [RH_CHAIN] });
          } else {
            throw e;
          }
        }
      }
      setWalletAddress(addr);
    } catch (err) {
      console.error('Wallet connect error:', err);
    }
  }, []);

  const disconnectWallet = useCallback(() => setWalletAddress(null), []);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accounts) => {
      setWalletAddress(accounts[0] || null);
    };
    const onChain = () => {
      if (walletAddress) connectWallet();
    };
    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts);
      window.ethereum.removeListener('chainChanged', onChain);
    };
  }, [walletAddress, connectWallet]);

  // ── actions ──
  const handleBorrow = async () => {
    if (!walletAddress) return;
    const amt = parseFloat(borrowInput.replace(/,/g, ''));
    if (!amt || amt <= 0) {
      alert('Enter a valid amount');
      return;
    }
    setBusy(true);
    try {
      const r = await api('/borrow', { method: 'POST', body: JSON.stringify({ address: walletAddress, collateralAmount: amt, asset: borrowAsset }) });
      if (r.error) {
        alert(r.error);
        return;
      }
      await refreshVault();
      await refreshPosition();
      setBorrowInput('0.00');
      setBorrowCalc({ receive: '0.00', fee: '—', maxline: '—', ltv: '0%' });
      alert('✅ Borrowed ' + fmt(r.netUsdg) + ' USDG from ' + fmt(amt) + ' ' + borrowAsset + ' collateral!');
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRepay = async () => {
    if (!walletAddress) return;
    const amt = parseFloat(repayInput.replace(/,/g, ''));
    if (!amt || amt <= 0) {
      alert('Enter a valid amount');
      return;
    }
    setBusy(true);
    try {
      const r = await api('/repay', { method: 'POST', body: JSON.stringify({ address: walletAddress, repayAmount: amt }) });
      if (r.error) {
        alert(r.error);
        return;
      }
      await refreshVault();
      await refreshPosition();
      setRepayInput('0.00');
      setRepayCalc({ redeem: '0.00', remDebt: '0 USDG', remColl: '0 HYBRID' });
      alert('✅ Repaid ' + fmt(r.repayAmount) + ' USDG, received ' + fmt(r.collateralOut, 4) + ' HYBRID!');
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleFaucet = async () => {
    try {
      const r = await api('/faucet', { method: 'POST', body: JSON.stringify({ address: walletAddress, asset: borrowAsset, amount: borrowAsset === 'ETH' ? 10 : 10000 }) });
      if (r.ok) {
        alert('✅ Got test ' + borrowAsset + (borrowAsset === 'ETH' ? ' (10 ETH)' : ' (10,000)!'));
        refreshPosition();
      }
    } catch (e) {
      alert('Faucet error: ' + e.message);
    }
  };

  const handleBorrowMax = async () => {
    if (!walletAddress) return;
    try {
      const v = await api('/position/' + walletAddress);
      const b = (v.balances && v.balances[borrowAsset]) || 0;
      const val = b.toLocaleString('en-US', { maximumFractionDigits: 2 });
      setBorrowInput(val);
      recalcBorrow(val);
    } catch (e) {}
  };

  const handleRepayMax = () => {
    const debt = (pos && pos.debt) || 0;
    const val = debt.toFixed(2);
    setRepayInput(val);
    recalcRepay(val);
  };

  const nav = (target) => {
    setPage(target);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const connected = !!walletAddress;
  const shortAddr = walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : '';

  return (
    <>
      <ThreeBackground />
      <div className="overlay" />

      {/* NAV */}
      <nav id="nav">
        <div className="nav-inner">
          <a
            href="#"
            className="nav-brand"
            onClick={(e) => {
              e.preventDefault();
              nav('overview');
            }}
          >
            <img src="/assets/logo-hybrid.png" alt="HYBRID" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
            <span>
              HYBRID<span style={{ color: '#00C805' }}>.</span>
            </span>
          </a>
          <div className={`nav-links${navOpen ? ' open' : ''}`}>
            {PAGES.map((p) => (
              <a
                key={p}
                href="#"
                className={page === p ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  nav(p);
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </a>
            ))}
          </div>
          <div className="nav-actions">
            <span className="chain">{connected ? <span style={{ color: '#00C805' }}>●</span> : null} {connected ? 'Connected' : 'Robinhood Chain'}</span>
            <button
              className={`btn ${connected ? 'btn-ghost' : 'btn-outline'}`}
              id="wallet-btn"
              style={{ fontSize: 12, padding: '7px 16px' }}
              onClick={connected ? disconnectWallet : connectWallet}
            >
              {connected ? shortAddr : 'Connect'}
            </button>
          </div>
          <button
            className={`hamburger${navOpen ? ' open' : ''}`}
            id="hamburger"
            aria-label="Menu"
            onClick={() => setNavOpen(!navOpen)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div className="container">
        {/* OVERVIEW */}
        <div className={`page${page === 'overview' ? ' active' : ''}`} id="page-overview">
          <section className="hero">
            <div className="hero-badge">
              ⟡ HYBRID PROTOCOL <span style={{ color: '#6b7280', fontWeight: 400 }}>|</span>{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#00C805' }}>CA: </span>
              <span
                style={{
                  fontWeight: 400,
                  textTransform: 'none',
                  letterSpacing: 0,
                  color: '#6b7280',
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 10,
                }}
              >
                0xbbea9aa55d3f9f3ef1686da2e67b1100b91fe5ba
              </span>
            </div>
            <h1>
              <span className="grad">Deposit HYBRID.</span>
              <br />
              <span className="grad">Borrow USDG.</span>
              <br />
              <span className="outline">Your collateral works for you.</span>
            </h1>
            <p>Deposit HYBRID tokens, borrow up to 50% LTV in USDG. No liquidation, no deadlines — your HYBRID stays yours.</p>
            <div className="hero-actions">
              <a
                href="#"
                className="btn btn-primary btn-lg"
                onClick={(e) => {
                  e.preventDefault();
                  nav('borrow');
                }}
              >
                Open borrow desk
              </a>
              <a
                href="#"
                className="btn btn-outline btn-lg"
                onClick={(e) => {
                  e.preventDefault();
                  nav('docs');
                }}
              >
                Read docs
              </a>
            </div>
            <div className="hero-stat">
              50% LTV <span>•</span> 3% fee <span>•</span> No liquidation
            </div>
          </section>

          <section className="section" style={{ paddingTop: 0 }}>
            <div className="vault-grid">
              <div className="v-card">
                <div className="l">Vault liquidity</div>
                <div className="v green">{fmt(vault ? vault.liquidity : 0)} USDG</div>
                <div className="v sub">Available to borrow</div>
              </div>
              <div className="v-card">
                <div className="l">Debt outstanding</div>
                <div className="v">{fmt(vault ? vault.debtOutstanding : 0)} USDG</div>
                <div className="v sub">
                  {vault ? vault.utilization.toFixed(1) : '0.0'}% of {fmt(vault ? vault.debtCap : 100000)} cap
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${Math.min(vault ? vault.utilization : 0, 100)}%` }} />
                </div>
              </div>
              <div className="v-card">
                <div className="l">Collateral held</div>
                <div className="v">{fmt(vault ? vault.collateralHeld : 0)} HYBRID</div>
                <div className="v sub">Backing all positions</div>
              </div>
              <div className="v-card">
                <div className="l">Protected price</div>
                <div className="v">${vault ? vault.protectedPrice.toFixed(4) : '—'}</div>
                <div className="v sub">{vault ? vault.sampleCount : 0}/7 keeper samples</div>
              </div>
            </div>

            <div className="two-col">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#4a4d55' }}>
                    Protocol status
                  </span>
                  <span className="flex" style={{ gap: 6, alignItems: 'center' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C805', display: 'inline-block' }} />
                    <span style={{ fontSize: 12, color: '#00C805' }}>Operational</span>
                  </span>
                </div>
                <h3>Vault overview</h3>
                <div className="desc">Real-time health</div>
                <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="info-item">
                    <div className="lbl">Utilization</div>
                    <div className="val">{vault ? vault.utilization.toFixed(1) : '0.0'}%</div>
                  </div>
                  <div className="info-item">
                    <div className="lbl">Debt cap</div>
                    <div className="val">100,000 USDG</div>
                  </div>
                  <div className="info-item">
                    <div className="lbl">Max LTV</div>
                    <div className="val">50%</div>
                  </div>
                  <div className="info-item">
                    <div className="lbl">Borrow fee</div>
                    <div className="val">3%</div>
                  </div>
                  <div className="info-item">
                    <div className="lbl">Price safety</div>
                    <div className="val">95%</div>
                  </div>
                  <div className="info-item">
                    <div className="lbl">Collateral</div>
                    <div className="val">HYBRID</div>
                  </div>
                  <div className="info-item">
                    <div className="lbl">HYBRID CA</div>
                    <div className="val" style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: '#00C805' }}>
                      0xbbea9aa55d3f9f3ef1686da2e67b1100b91fe5ba
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="lbl">Borrow asset</div>
                    <div className="val">USDG</div>
                  </div>
                  <div className="info-item">
                    <div className="lbl">Chain</div>
                    <div className="val">RH 4663</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Your position</h3>
                <div className="desc">{connected ? shortAddr : 'Connect wallet to view'}</div>
                <div className="pos-card">
                  <div className="row">
                    <span className="lbl">Collateral</span>
                    <span className="val">{fmt(pos ? pos.collateral : 0, 4)} HYBRID</span>
                  </div>
                  <div className="row">
                    <span className="lbl">Outstanding debt</span>
                    <span className="val red">{fmt(pos ? pos.debt : 0)} USDG</span>
                  </div>
                  <div className="row">
                    <span className="lbl">Redeemable</span>
                    <span className="val green">{fmt(pos ? pos.redeemable : 0, 4)} HYBRID</span>
                  </div>
                  <div className="row" style={{ borderBottom: 'none' }}>
                    <span className="lbl">LTV</span>
                    <span className="val">{(pos ? pos.ltv : 0).toFixed(1)}%</span>
                  </div>
                </div>
                <button
                  className="btn btn-outline btn-block"
                  id="manage-btn"
                  onClick={() => {
                    if (!walletAddress) {
                      connectWallet();
                      return;
                    }
                    nav('borrow');
                  }}
                >
                  Manage position
                </button>
              </div>
            </div>

            <div className="section-label">Why HYBRID</div>
            <h2 className="section-title">Borrow without selling</h2>
            <p className="section-sub">Deposit HYBRID as collateral, borrow USDG at up to 50% LTV. No liquidation, no deadlines.</p>
            <div className="features">
              <div className="feature">
                <div className="icon g">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3>No liquidation</h3>
                <p>There&apos;s no liquidation threshold or deadline. Your position stays open as long as you want.</p>
              </div>
              <div className="feature">
                <div className="icon g">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 20V10" />
                    <path d="M12 20V4" />
                    <path d="M6 20v-6" />
                  </svg>
                </div>
                <h3>Keeper price safety</h3>
                <p>Borrow calculations use a protected rolling price sample with 95% safety margin.</p>
              </div>
              <div className="feature">
                <div className="icon g">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </div>
                <h3>Proportional redeem</h3>
                <p>Repay any amount, receive collateral proportionally. No minimum repayments.</p>
              </div>
            </div>
          </section>
        </div>

        {/* BORROW */}
        <div className={`page${page === 'borrow' ? ' active' : ''}`} id="page-borrow">
          <section className="section" style={{ paddingTop: 100 }}>
            <div className="text-center mb-24">
              <div className="hero-badge" style={{ marginBottom: 12 }}>
                ⟡ OPEN POSITION
              </div>
              <h1 className="section-title" style={{ fontSize: 'clamp(28px,4vw,40px)' }}>
                Deposit HYBRID, receive USDG
              </h1>
              <p className="section-sub" style={{ maxWidth: 440, margin: '0 auto 32px' }}>
                Deposit HYBRID tokens and borrow USDG at up to 50% LTV.
              </p>
            </div>
            <div className="form-card card">
              <h3>New borrow</h3>
              <div className="desc">Enter HYBRID amount to deposit</div>
              <div className="input-group">
                <label>Collateral</label>
                <div className="input-box">
                  <input
                    type="text"
                    value={borrowInput}
                    placeholder="0.00"
                    id="borrow-input"
                    onChange={(e) => {
                      setBorrowInput(e.target.value);
                      recalcBorrow(e.target.value);
                    }}
                  />
                  <span className="suffix">HYBRID</span>
                  <button className="max-btn" id="borrow-max" onClick={handleBorrowMax}>
                    MAX
                  </button>
                </div>
                <div className="quick-btns">
                  {[1000, 5000, 10000, 25000].map((a) => (
                    <button
                      key={a}
                      data-amt={a}
                      onClick={() => {
                        setBorrowInput(String(a));
                        recalcBorrow(String(a));
                      }}
                    >
                      {a.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="balance-line">
                  <span>Balance</span>
                  <span>{pos && pos.balances ? fmt(pos.balances.HYBRID) : '—'} HYBRID</span>
                </div>
              </div>
              <div className="input-group">
                <label>You receive</label>
                <div className="input-box" style={{ borderColor: 'rgba(0,200,5,.12)' }}>
                  <input type="text" value={borrowCalc.receive} placeholder="0.00" readOnly id="borrow-receive" />
                  <span className="suffix">USDG</span>
                </div>
                <div className="balance-line">
                  <span>Max @ 50% LTV</span>
                  <span>{borrowCalc.maxline} USDG</span>
                </div>
              </div>
              <div className="pos-card" style={{ marginTop: 16 }}>
                <div className="row">
                  <span className="lbl">Borrow fee (3%)</span>
                  <span className="val">{borrowCalc.fee} USDG</span>
                </div>
                <div className="row" style={{ borderBottom: 'none' }}>
                  <span className="lbl">LTV after borrow</span>
                  <span className="val">{borrowCalc.ltv}</span>
                </div>
              </div>
              <button
                className="btn btn-primary btn-block btn-lg mt-16"
                id="borrow-btn"
                disabled
                onClick={handleBorrow}
              >
                Soon
              </button>
              <button
                className="btn btn-ghost btn-block mt-8"
                id="faucet-btn"
                style={{ display: connected ? 'block' : 'none', fontSize: 11 }}
                onClick={handleFaucet}
              >
                + Get test HYBRID
              </button>
            </div>
          </section>
        </div>

        {/* REPAY */}
        <div className={`page${page === 'repay' ? ' active' : ''}`} id="page-repay">
          <section className="section" style={{ paddingTop: 100 }}>
            <div className="text-center mb-24">
              <div className="hero-badge" style={{ marginBottom: 12 }}>
                ⟡ REPAY &amp; REDEEM
              </div>
              <h1 className="section-title" style={{ fontSize: 'clamp(28px,4vw,40px)' }}>
                Pay back USDG, reclaim HYBRID
              </h1>
              <p className="section-sub" style={{ maxWidth: 400, margin: '0 auto 32px' }}>
                Repay any amount and redeem collateral proportionally.
              </p>
            </div>
            <div className="form-card card">
              <h3>Repay &amp; redeem</h3>
              <div className="desc">Enter USDG amount to repay</div>
              <div className="input-group">
                <label>Repay amount</label>
                <div className="input-box">
                  <input
                    type="text"
                    value={repayInput}
                    placeholder="0.00"
                    id="repay-input"
                    onChange={(e) => {
                      setRepayInput(e.target.value);
                      recalcRepay(e.target.value);
                    }}
                  />
                  <span className="suffix">USDG</span>
                  <button className="max-btn" id="repay-max" onClick={handleRepayMax}>
                    MAX
                  </button>
                </div>
                <div className="balance-line">
                  <span>Outstanding debt</span>
                  <span>{pos ? fmt(pos.debt) : '0'} USDG</span>
                </div>
              </div>
              <div className="input-group">
                <label>You redeem</label>
                <div className="input-box" style={{ borderColor: 'rgba(0,200,5,.12)' }}>
                  <input type="text" value={repayCalc.redeem} placeholder="0.00" readOnly id="repay-redeem" />
                  <span className="suffix">HYBRID</span>
                </div>
                <div className="balance-line">
                  <span>Collateral locked</span>
                  <span>{pos ? fmt(pos.collateral, 4) : '0'} HYBRID</span>
                </div>
              </div>
              <div className="pos-card" style={{ marginTop: 16 }}>
                <div className="row">
                  <span className="lbl">Remaining debt</span>
                  <span className="val">{repayCalc.remDebt}</span>
                </div>
                <div className="row" style={{ borderBottom: 'none' }}>
                  <span className="lbl">Remaining collateral</span>
                  <span className="val">{repayCalc.remColl}</span>
                </div>
              </div>
              <button
                className="btn btn-primary btn-block btn-lg mt-16"
                id="repay-btn"
                disabled={!connected || busy}
                onClick={handleRepay}
              >
                {!connected ? 'Connect wallet to continue' : busy ? 'Processing...' : 'Repay & redeem'}
              </button>
            </div>
          </section>
        </div>

        {/* ANALYTICS */}
        <div className={`page${page === 'analytics' ? ' active' : ''}`} id="page-analytics">
          <section className="section" style={{ paddingTop: 100 }}>
            <div className="mb-24">
              <div className="hero-badge" style={{ marginBottom: 12 }}>
                ⟡ ANALYTICS
              </div>
              <h1 className="section-title" style={{ fontSize: 'clamp(28px,4vw,40px)' }}>
                Protocol dashboard
              </h1>
              <p className="section-sub">Live vault metrics and activity.</p>
            </div>
            <div className="vault-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              <div className="v-card">
                <div className="l">Total value locked</div>
                <div className="v green">${fmt(vault ? vault.collateralHeld * vault.protectedPrice : 0)}</div>
              </div>
              <div className="v-card">
                <div className="l">Total borrowed</div>
                <div className="v">{fmt(vault ? vault.debtOutstanding : 0)} USDG</div>
              </div>
              <div className="v-card">
                <div className="l">Active borrowers</div>
                <div className="v">{pos ? 1 : 0}</div>
              </div>
              <div className="v-card">
                <div className="l">Fees collected</div>
                <div className="v">0 USDG</div>
              </div>
            </div>
            <div className="tabs">
              <button className={`tab${analyticsTab === 'activity' ? ' active' : ''}`} onClick={() => setAnalyticsTab('activity')}>
                Activity
              </button>
              <button className={`tab${analyticsTab === 'positions' ? ' active' : ''}`} onClick={() => setAnalyticsTab('positions')}>
                Positions
              </button>
            </div>
            <div id="at-activity" style={{ display: analyticsTab === 'activity' ? '' : 'none' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tx</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Time</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="5" className="empty">
                        No activity yet
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div id="at-positions" style={{ display: analyticsTab === 'positions' ? '' : 'none' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Collateral</th>
                      <th>Debt</th>
                      <th>LTV</th>
                      <th>Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="5" className="empty">
                        No open positions
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* DOCS */}
        <div className={`page${page === 'docs' ? ' active' : ''}`} id="page-docs">
          <section className="section" style={{ paddingTop: 100 }}>
            <div className="mb-24">
              <div className="hero-badge" style={{ marginBottom: 12 }}>
                ⟡ DOCS
              </div>
              <h1 className="section-title" style={{ fontSize: 'clamp(28px,4vw,40px)' }}>
                Protocol guide
              </h1>
              <p className="section-sub">How HYBRID lending works.</p>
            </div>
            <div className="docs-layout">
              <div className="docs-sidebar">
                {[
                  ['d-mech', 'Mechanics'],
                  ['d-borrow', 'Borrowing'],
                  ['d-repay', 'Repayment'],
                  ['d-price', 'Price safety'],
                  ['d-contract', 'Contract'],
                ].map(([id, label]) => (
                  <a
                    key={id}
                    href={'#' + id}
                    onClick={(e) => {
                      e.preventDefault();
                      const target = document.getElementById(id);
                      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
              <div className="docs-content">
                <h2 id="d-mech">Protocol mechanics</h2>
                <p>
                  HYBRID accepts a configured ERC-20 collateral asset (HYBRID) and automatically borrows USDG in the same deposit
                  transaction. The configured upper bound is <strong>50% LTV</strong>, subject to price, debt-cap, and per-user
                  pool-share checks.
                </p>
                <h2 id="d-borrow">Borrowing</h2>
                <p>
                  Approve the HYBRID token, enter an amount equal to or above the contract minimum, then use{' '}
                  <strong>Deposit &amp; borrow</strong>. The contract records gross debt, sends{' '}
                  <strong>net USDG after the 3% borrow fee</strong>, and holds the collateral.
                </p>
                <h2 id="d-repay">Repayment &amp; redemption</h2>
                <p>
                  Call <code>repayAndRedeemProportionally</code> with USDG. The contract applies no more than your debt, refunds
                  excess, and sends collateral proportional to your repayment. If remaining debt would be below the minimum, repay
                  in full instead.
                </p>
                <h2 id="d-price">Price safeguards</h2>
                <p>
                  Keeper or owner supplies price samples. The contract averages up to <strong>7 samples</strong>, applies a{' '}
                  <strong>95% safety factor</strong>, enforces a <strong>one-minute update cooldown</strong>, and rejects jumps
                  above <strong>10%</strong> from the sample average.
                </p>
                <h2 id="d-contract">Contract &amp; network</h2>
                <p>
                  <strong>HYBRID proxy:</strong> <code>Not deployed</code>
                  <br />
                  <strong>HYBRID token:</strong> <code>Not deployed</code>
                  <br />
                  <strong>Network:</strong> Robinhood Chain (4663) · borrow asset: USDG
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* FOOTER */}
      <footer
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 28px',
          borderTop: '1px solid rgba(255,255,255,.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ fontSize: 12, color: '#3a3d45' }}>HYBRID · Lending on Robinhood Chain</div>
        <div style={{ fontSize: 11, color: '#3a3d45', fontFamily: "'JetBrains Mono',monospace" }}>CA: 0xbbea9aa55d3f9f3ef1686da2e67b1100b91fe5ba</div>
        <div className="flex" style={{ gap: 20 }}>
          <a href="https://x.com/GetHybridCash" target="_blank" rel="noreferrer" style={{ color: '#4a4d55', textDecoration: 'none', fontSize: 13 }}>
            𝕏 @GetHybridCash
          </a>
          <a
            href="#"
            style={{ color: '#4a4d55', textDecoration: 'none', fontSize: 13 }}
            onClick={(e) => {
              e.preventDefault();
              nav('docs');
            }}
          >
            Docs
          </a>
        </div>
      </footer>
    </>
  );
}
