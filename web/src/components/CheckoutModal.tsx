'use client';

import { useCallback, useEffect, useState } from 'react';

type Quote = {
  intent: string;
  kind: string;
  asset: string;
  token_address: string | null;
  decimals: number;
  symbol: string;
  priceUsd: string;
  amountUsd: number;
  feeUsd: number;
  totalUsd: number;
  units: string;
  to: string;
  displayUnits: string;
};

const ASSETS = [
  { sym: 'USDG', name: 'Global Dollar', badge: '1:1' },
  { sym: 'ETH', name: 'Ether', badge: 'live' },
  { sym: 'WETH', name: 'Wrapped Ether', badge: 'live' },
];
const AMOUNTS = [
  { amt: '10', sub: 'min load' },
  { amt: '20', sub: '' },
  { amt: '50', sub: '' },
  { amt: '100', sub: '' },
  { amt: '250', sub: '' },
];

function shortAddr(a: string) {
  return a.slice(0, 6) + '…' + a.slice(-4);
}
function escapeHtml(s: string) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// minimal ERC20 transfer encoding: transfer(address,uint256)
function encodeTransfer(tokenAddr: string, to: string, units: string) {
  const methodId = 'a9059cbb';
  const toHex = to.slice(2).toLowerCase().padStart(64, '0');
  const amtHex = BigInt(units).toString(16).padStart(64, '0');
  return '0x' + methodId + toHex + amtHex;
}

export default function CheckoutModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [asset, setAsset] = useState('USDG');
  const [amount, setAmount] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState<{ cardId: string; tx: string } | null>(
    null
  );
  const [checking, setChecking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [txHash, setTxHash] = useState('');

  const reset = useCallback(() => {
    setStep(1);
    setAsset('USDG');
    setAmount(null);
    setQuote(null);
    setBusy(false);
    setNotice('');
    setSuccess(null);
    setChecking(false);
    setTimedOut(false);
    setTxHash('');
  }, []);

  const openModal = useCallback(() => {
    reset();
    setOpen(true);
    document.body.style.overflow = 'hidden';
  }, [reset]);
  const closeModal = useCallback(() => {
    setOpen(false);
    document.body.style.overflow = '';
    reset();
  }, [reset]);

  useEffect(() => {
    const openers = document.querySelectorAll('.js-get-card');
    const onClick = (e: Event) => {
      e.preventDefault();
      openModal();
    };
    openers.forEach((b) => b.addEventListener('click', onClick));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      openers.forEach((b) => b.removeEventListener('click', onClick));
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closeModal, openModal]);

  async function connectAndQuote() {
    if (!window.ethereum) {
      setNotice(
        'No wallet detected. Install a wallet that supports Robinhood Chain (e.g. Rabby, MetaMask) and connect it.'
      );
      return;
    }
    setBusy(true);
    try {
      await (window.ethereum as any).request({ method: 'eth_requestAccounts' });
      // ensure chain 4663 — check first, switch only if needed
      let curChain = '0x0';
      try {
        curChain = await (window.ethereum as any).request({
          method: 'eth_chainId',
        });
      } catch (e2) {}
      if (curChain !== '0x1237') {
        try {
          await (window.ethereum as any).request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1237' }],
          });
        } catch (e: any) {
          // Rabby sometimes throws a cryptic "reading 'headers'" error here
          // instead of code 4902 when the chain isn't added yet. On ANY switch
          // failure, try to add the chain; only if that also fails show manual steps.
          try {
            await (window.ethereum as any).request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x1237',
                  chainName: 'Robinhood Chain',
                  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
                  blockExplorerUrls: ['https://robinhoodchain.blockscout.com'],
                },
              ],
            });
            await (window.ethereum as any).request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x1237' }],
            });
          } catch (e2) {
            setNotice(
              'Your wallet could not switch automatically. Add Robinhood Chain manually: Chain ID 4663, RPC rpc.mainnet.chain.robinhood.com — then press retry.'
            );
            return;
          }
        }
      }

      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ asset, amountUsd: Number(amount) }),
      });
      const q = await res.json();
      if (!res.ok) throw new Error(q.error || 'Could not create a quote');
      setQuote(q);
      setStep(3);
      setBusy(false);
    } catch (e: any) {
      setNotice('Something went wrong: ' + escapeHtml(e.message || String(e)));
      setBusy(false);
    }
  }

  async function payAndConfirm() {
    if (!quote) return;
    setBusy(true);
    try {
      const from = (
        await (window.ethereum as any).request({ method: 'eth_requestAccounts' })
      )[0];
      let tx: string;
      if (quote.token_address) {
        const data = encodeTransfer(quote.token_address, quote.to, quote.units);
        tx = await (window.ethereum as any).request({
          method: 'eth_sendTransaction',
          params: [{ from, to: quote.token_address, data }],
        });
      } else {
        tx = await (window.ethereum as any).request({
          method: 'eth_sendTransaction',
          params: [
            { from, to: quote.to, value: '0x' + BigInt(quote.units).toString(16) },
          ],
        });
      }
      // poll backend confirm
      setTxHash(tx);
      setChecking(true);
      let ok = false;
      for (let i = 0; i < 30; i++) {
        await sleep(2000);
        const res = await fetch('/api/confirm', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ intent: quote.intent, txHash: tx }),
        });
        const data = await res.json();
        if (data.status === 'done') {
          ok = true;
          setSuccess({ cardId: data.cardId || 'card_ready', tx });
          setChecking(false);
          break;
        }
        if (data.status === 'expired') break;
      }
      if (!ok) {
        setChecking(false);
        setTimedOut(true);
      }
    } catch (e: any) {
      setNotice('Transaction failed: ' + escapeHtml(e.message || String(e)));
      setBusy(false);
    }
  }

  const display =
    quote &&
    (Number(quote.displayUnits) >= 0.001
      ? quote.displayUnits + ' ' + quote.symbol
      : (Number(quote.totalUsd) / Number(quote.priceUsd)).toFixed(6) +
        ' ' +
        quote.symbol);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <h3 id="modalTitle">Get your card</h3>
          <button className="modal-close" aria-label="Close" onClick={closeModal}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {success ? (
            <div className="modal-success">
              <div className="check">✓</div>
              <h3>Your card is funded!</h3>
              <p>
                Deposit confirmed onchain. Your Hybrid Cash card balance is being
                issued now — check your email / dashboard shortly.
              </p>
              <div className="ref">{success.cardId}</div>
              <button
                className="modal-cta"
                style={{ marginTop: 16 }}
                onClick={closeModal}
              >
                DONE
              </button>
            </div>
          ) : checking || timedOut ? (
            <div className="modal-success">
              <div className="spinner" aria-hidden="true"></div>
              <h3>
                {timedOut
                  ? 'Still verifying…'
                  : 'Verifying your payment'}
              </h3>
              <p>
                {timedOut
                  ? "Your transaction was sent and is safe. It's taking a little longer than usual to confirm onchain."
                  : 'Waiting for the network to confirm your deposit. This usually takes a few seconds.'}
              </p>
              {txHash && <div className="ref">{shortAddr(txHash)}</div>}
              {timedOut && (
                <button
                  className="modal-cta"
                  style={{ marginTop: 16 }}
                  onClick={async () => {
                    setTimedOut(false);
                    setChecking(true);
                    if (!quote) return;
                    try {
                      const res = await fetch('/api/confirm', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                          intent: quote.intent,
                          txHash,
                        }),
                      });
                      const data = await res.json();
                      if (data.status === 'done') {
                        setSuccess({ cardId: data.cardId || 'card_ready', tx: txHash });
                        setChecking(false);
                      } else {
                        setChecking(false);
                        setTimedOut(true);
                      }
                    } catch (_) {
                      setChecking(false);
                      setTimedOut(true);
                    }
                  }}
                >
                  CHECK AGAIN
                </button>
              )}
            </div>
          ) : step === 1 ? (
            <>
              <div className="modal-step" data-step="1">
                Step 1 / 3
              </div>
              <div className="modal-title">Deposit crypto to fund your card</div>
              <div className="modal-sub">
                Pick what you want to deposit. The card balance is funded the
                moment the transaction confirms onchain — no bank, no paperwork.
              </div>
              <div className="asset-options" id="assetOptions">
                {ASSETS.map((a) => (
                  <label
                    key={a.sym}
                    className={'asset-opt' + (asset === a.sym ? ' sel' : '')}
                  >
                    <input
                      type="radio"
                      name="asset"
                      value={a.sym}
                      checked={asset === a.sym}
                      onChange={() => setAsset(a.sym)}
                    />
                    <span className="asset-sym">{a.sym}</span>
                    <span className="asset-name">{a.name}</span>
                    <span className="asset-badge">{a.badge}</span>
                  </label>
                ))}
              </div>
              <div className="amount-options" id="amountOptions">
                {AMOUNTS.map((a) => (
                  <div
                    key={a.amt}
                    className={'load-opt' + (amount === a.amt ? ' sel' : '')}
                    onClick={() => setAmount(a.amt)}
                  >
                    <div className="am">${a.amt}</div>
                    <div className="ap">{a.sub}</div>
                  </div>
                ))}
              </div>
              <button
                className="modal-cta"
                disabled={!amount}
                onClick={() => setStep(2)}
              >
                CONTINUE →
              </button>
              <div className="modal-note">
                One-time $5 card fee. Top-ups free. Network gas free.
              </div>
            </>
          ) : step === 2 ? (
            <>
              <div className="modal-step" data-step="2">
                Step 2 / 3
              </div>
              <div className="modal-title">Connect your wallet</div>
              <div className="modal-sub">
                Connect the wallet holding your {asset} on Robinhood Chain to
                continue.
              </div>
              <button
                className="modal-cta"
                onClick={connectAndQuote}
                disabled={busy}
              >
                {busy ? 'REQUESTING QUOTE…' : 'CONNECT WALLET →'}
              </button>
              {notice && (
                <div className="modal-note" style={{ color: 'var(--red)' }}>
                  {notice}
                </div>
              )}
              <div className="modal-note">
                We&apos;ll never move funds without your explicit signature.
              </div>
            </>
          ) : (
            quote && (
              <>
                <div className="modal-step" data-step="3">
                  Step 3 / 3 — Review &amp; pay
                </div>
                <div className="modal-title">Confirm your deposit</div>
                <div className="modal-sub">
                  You&apos;re depositing crypto to the Hybrid Cash treasury.
                  Review the amount, then approve in your wallet.
                </div>
                <div className="pay-summary">
                  <div className="pay-row">
                    <span className="k">Load</span>
                    <span className="v">${Number(quote.amountUsd).toFixed(2)}</span>
                  </div>
                  {Number(quote.feeUsd) > 0 ? (
                    <div className="pay-row">
                      <span className="k">Card fee</span>
                      <span className="v">${Number(quote.feeUsd).toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="pay-row">
                      <span className="k">Card fee</span>
                      <span className="v g">FREE</span>
                    </div>
                  )}
                  <div className="pay-row">
                    <span className="k">Total</span>
                    <span className="v">{display}</span>
                  </div>
                  <div className="pay-row">
                    <span className="k">Treasury</span>
                    <span className="v mono">{shortAddr(quote.to)}</span>
                  </div>
                  <div className="pay-row">
                    <span className="k">Chain</span>
                    <span className="v">Robinhood (4663)</span>
                  </div>
                </div>
                <button
                  className="modal-cta"
                  onClick={payAndConfirm}
                  disabled={busy}
                >
                  {busy ? 'WAITING FOR YOUR WALLET…' : 'PAY ' + display}
                </button>
                <button
                  className="modal-back"
                  onClick={() => {
                    reset();
                    setOpen(true);
                  }}
                >
                  ← Back
                </button>
                <div className="modal-note">
                  Transaction is pre-filled — you approve it in your wallet.
                  Nothing is moved without your signature.
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
