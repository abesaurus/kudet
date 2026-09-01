/**
 * Hybrid Cash — Lending backend
 * Deposit HYBRID → borrow USDG (LTV 50%, fee 3%, no liquidation,
 * keeper price, proportional redeem).
 *
 * State is persisted to lending-state.json so the vault is "live"
 * across restarts (on-chain wiring swaps in once the proxy deploys).
 *
 * Endpoints:
 *   GET  /api/vault                 → vault stats
 *   GET  /api/position/:address     → user position
 *   POST /api/borrow                → { address, collateralAmount }
 *   POST /api/repay                 → { address, repayAmount }
 *   POST /api/price                 → { price }   (keeper set sample)
 *   GET  /api/hybrid-balance/:addr  → HYBRID balance (for MAX button)
 *   GET  /api/usdg-balance/:addr    → USDG balance (for MAX button)
 *   POST /api/faucet                → { address, asset: 'HYBRID'|'USDG', amount } (test top-up)
 */
import express from 'express';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4190;
const STATE_FILE = path.join(__dirname, 'lending-state.json');

// ── protocol constants (mirror HybridLending.sol) ──
const BPS = 10000;
const WAD = 1e18;
const MAX_SAMPLES = 7;
const COOLDOWN = 60;            // seconds between keeper samples
const MAX_JUMP_BPS = 1000;      // 10%
const DEC = 18;                 // HYBRID/ETH decimals
const USDG_DEC = 6;             // USDG decimals
const ETH_PRICE = 2447.27;      // ETH price in USD (for testing)

// ── default state ──
const defaultState = () => ({
  version: 2,
  feeBps: 300,
  maxLtvBps: 5000,
  safetyFactorBps: 9500,
  debtCap: 100000,              // 100k USDG
  minBorrow: 0.01,
  samples: [1.0],               // HYBRID ≈ $1.00 (USDG per HYBRID)
  lastSampleAt: Date.now(),
  positions: {},                // addr -> { collateral, debt } (HYBRID / USDG units)
  balances: {},                // addr -> { HYBRID, USDG, ETH } — test balances (since no deployed token)
});

// load state
let state = defaultState();
if (existsSync(STATE_FILE)) {
  try {
    const saved = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    state = { ...defaultState(), ...saved };
    // ensure nested keys exist
    state.positions = state.positions || {};
    state.balances = state.balances || {};
  } catch (e) {
    console.error('⚠️  Failed to read state file, using defaults:', e.message);
  }
}

function persist() {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('⚠️  Failed to persist state:', e.message);
  }
}

// ── helpers ──
const round = (n, dp = 6) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

function sampleAvg() {
  if (!state.samples.length) return 0;
  return state.samples.reduce((a, b) => a + b, 0) / state.samples.length;
}

function protectedPrice() {
  return sampleAvg() * (state.safetyFactorBps / BPS);
}

function utilization() {
  const debt = totalDebt();
  return state.debtCap > 0 ? (debt / state.debtCap) * 100 : 0;
}

function totalDebt() {
  return Object.values(state.positions).reduce((s, p) => s + (p.debt || 0), 0);
}

function totalCollateral() {
  return Object.values(state.positions).reduce((s, p) => s + (p.collateral || 0), 0);
}

// position of a user (live-computed)
function positionOf(addr) {
  const p = state.positions[addr] || { collateral: 0, debt: 0, asset: 'HYBRID' };
  const asset = p.asset || 'HYBRID';
  const price = asset === 'ETH' ? ETH_PRICE : protectedPrice();
  const collValue = p.collateral * price;
  const ltv = collValue > 0 ? (p.debt / collValue) * 100 : 0;
  return {
    address: addr,
    asset,
    collateral: p.collateral,
    debt: p.debt,
    ltv,
    price,
    redeemable: p.debt > 0 && p.collateral > 0 ? p.collateral : 0,
  };
}

function getOrInit(addr) {
  if (!state.positions[addr]) state.positions[addr] = { collateral: 0, debt: 0, asset: 'HYBRID' };
  if (!state.balances[addr]) state.balances[addr] = { HYBRID: 0, USDG: 0, ETH: 0 };
  if (state.balances[addr].ETH === undefined) state.balances[addr].ETH = 0;
  return state.positions[addr];
}

// ── express ──
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const norm = (a = '') => String(a).toLowerCase();

// ---- vault stats ----
app.get('/api/vault', (req, res) => {
  const debt = totalDebt();
  const coll = totalCollateral();
  res.json({
    liquidity: round(Math.max(0, state.debtCap - debt), 2),
    debtOutstanding: round(debt, 6),
    collateralHeld: round(coll, 4),
    utilization: round(debt / state.debtCap * 100, 2),
    debtCap: state.debtCap,
    maxLtvBps: state.maxLtvBps,
    feeBps: state.feeBps,
    safetyFactorBps: state.safetyFactorBps,
    protectedPrice: round(protectedPrice(), 6),
    samples: state.samples,
    sampleCount: state.samples.length,
    price: round(sampleAvg(), 6),
    minBorrow: state.minBorrow,
    status: 'operational',
    deployed: false, // true once proxy live
  });
});

// ---- user position ----
app.get('/api/position/:address', (req, res) => {
  const addr = norm(req.params.address);
  getOrInit(addr);
  persist();
  const p = positionOf(addr);
  res.json({ ...p, balances: state.balances[addr] || { HYBRID: 0, USDG: 0 } });
});

// ---- HYBRID / USDG balance (test balances; real once token deploys) ----
app.get('/api/hybrid-balance/:address', (req, res) => {
  const addr = norm(req.params.address);
  getOrInit(addr);
  res.json({ address: addr, balance: state.balances[addr].HYBRID, decimals: DEC });
});
app.get('/api/usdg-balance/:address', (req, res) => {
  const addr = norm(req.params.address);
  getOrInit(addr);
  res.json({ address: addr, balance: state.balances[addr].USDG, decimals: USDG_DEC });
});

// ---- borrow (deposit + borrow) ----
app.post('/api/borrow', (req, res) => {
  try {
    const { address, collateralAmount, asset = 'HYBRID' } = req.body || {};
    const addr = norm(address);
    if (!addr || !/^0x[0-9a-f]{40}$/.test(addr)) return res.status(400).json({ error: 'Invalid address' });
    const amount = Number(collateralAmount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid collateral amount' });
    const a = String(asset).toUpperCase();
    if (!['HYBRID', 'ETH'].includes(a)) return res.status(400).json({ error: 'Collateral asset must be HYBRID or ETH' });

    getOrInit(addr);
    const bal = state.balances[addr][a];
    if (amount > bal) return res.status(400).json({ error: `Insufficient ${a} balance (${round(bal,4)} available)` });

    const price = a === 'ETH' ? ETH_PRICE : protectedPrice();
    const collValue = amount * price;
    const maxBorrow = collValue * (state.maxLtvBps / BPS);
    const availableLiquidity = Math.max(0, state.debtCap - totalDebt());
    const grossDebt = Math.min(maxBorrow, availableLiquidity);
    if (grossDebt < state.minBorrow) {
      return res.status(400).json({ error: `Below minimum borrow of ${state.minBorrow} USDG` });
    }
    const fee = grossDebt * (state.feeBps / BPS);
    const netUsdg = grossDebt - fee;

    state.balances[addr][a] -= amount;
    state.balances[addr].USDG += netUsdg;
    state.positions[addr].collateral += amount;
    state.positions[addr].debt += grossDebt;
    state.positions[addr].asset = a;
    persist();

    res.json({ ok: true, ...positionOf(addr), netUsdg: round(netUsdg, 6), fee: round(fee, 6), grossDebt: round(grossDebt, 6), balances: state.balances[addr] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- repay (proportional redeem) ----
app.post('/api/repay', (req, res) => {
  try {
    const { address, repayAmount } = req.body || {};
    const addr = norm(address);
    if (!addr || !/^0x[0-9a-f]{40}$/.test(addr)) return res.status(400).json({ error: 'Invalid address' });
    const amount = Number(repayAmount);
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Invalid repay amount' });

    getOrInit(addr);
    const p = state.positions[addr];
    if (p.debt <= 0) return res.status(400).json({ error: 'No outstanding debt' });

    let applied = Math.min(amount, p.debt);
    if (applied === 0) return res.status(400).json({ error: 'Amount is zero' });

    // if repaying all (or above), clear debt + return all collateral
    let collateralOut;
    if (applied >= p.debt) {
      collateralOut = p.collateral;
      p.debt = 0;
      p.collateral = 0;
    } else {
      collateralOut = p.collateral * (applied / p.debt);
      p.collateral -= collateralOut;
      p.debt -= applied;
    }

    state.balances[addr].USDG -= applied;
    if (state.balances[addr].USDG < 0) {
      // not enough USDG in test balance — allow but clamp (flag)
      state.balances[addr].USDG = Math.max(0, state.balances[addr].USDG);
    }
    const asset = p.asset || 'HYBRID';
    state.balances[addr][asset] += collateralOut;
    persist();

    res.json({ ok: true, ...positionOf(addr), repayAmount: round(applied, 6), collateralOut: round(collateralOut, 4), asset, balances: state.balances[addr] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- keeper set price sample ----
app.post('/api/price', (req, res) => {
  try {
    const { price } = req.body || {};
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return res.status(400).json({ error: 'Invalid price' });
    const now = Date.now();
    if (now - state.lastSampleAt < COOLDOWN * 1000) {
      return res.status(429).json({ error: `Cooldown active (${Math.ceil((COOLDOWN - (now - state.lastSampleAt) / 1000))}s left)` });
    }
    const avg = sampleAvg();
    if (state.samples.length > 0) {
      const diff = Math.abs(p - avg);
      if ((diff * BPS) / avg > MAX_JUMP_BPS) return res.status(400).json({ error: 'Jump too big (>10%)' });
    }
    state.samples.push(p);
    if (state.samples.length > MAX_SAMPLES) state.samples.shift();
    state.lastSampleAt = now;
    persist();
    res.json({ ok: true, samples: state.samples, price: round(sampleAvg(), 6), protected: round(protectedPrice(), 6) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- faucet (test top-up so users can try the flow) ----
app.post('/api/faucet', (req, res) => {
  const { address, asset, amount } = req.body || {};
  const addr = norm(address);
  if (!addr || !/^0x[0-9a-f]{40}$/.test(addr)) return res.status(400).json({ error: 'Invalid address' });
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const a = String(asset || '').toUpperCase();
  if (!['HYBRID', 'USDG', 'ETH'].includes(a)) return res.status(400).json({ error: 'Asset must be HYBRID, USDG, or ETH' });
  getOrInit(addr);
  state.balances[addr][a] += amt;
  persist();
  res.json({ ok: true, address: addr, asset: a, balance: state.balances[addr][a] });
});

app.get('/health', (req, res) => res.json({ ok: true, mode: 'lending', deployed: false, positions: Object.keys(state.positions).length }));

app.listen(PORT, () => {
  console.log(`✅ Hybrid Cash Lending API on :${PORT}`);
  console.log(`   Price samples: ${state.samples.length} | Protected price: ${protectedPrice()}`);
  console.log(`   State file: ${STATE_FILE}`);
});
