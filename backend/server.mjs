/**
 * Hybrid Cash backend — crypto checkout
 * Users deposit USDG/ETH to a treasury wallet; the backend verifies
 * the deposit on-chain and marks the card "funded".
 *
 * Real RPC: Robinhood Chain 4663 (Hood Chain)
 */
import express from 'express';
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { defineChain } from 'viem';

// ---- config ----
const PORT = process.env.PORT || 4200;
const TREASURY = (process.env.TREASURY_ADDRESS || '').toLowerCase();
const RPC_URL = process.env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';

if (!TREASURY || TREASURY === '0x0000000000000000000000000000000000000000') {
  console.error('❌ TREASURY_ADDRESS not set in .env — deposits have nowhere to go.');
  process.exit(1);
}

// ---- chain ----
const hoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const publicClient = createPublicClient({ chain: hoodChain, transport: http(RPC_URL) });

// ---- supported assets (mirrors RWA Cash / on-chain verified) ----
const ASSETS = {
  USDG: {
    symbol: 'USDG',
    name: 'Global Dollar',
    kind: 'stable',
    address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
    decimals: 6,
    priceUsd: 1,
    available: true,
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ether',
    kind: 'native',
    address: null, // native
    decimals: 18,
    priceUsd: 2447.27, // fallback, refreshed from API
    available: true,
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    kind: 'crypto',
    address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73',
    decimals: 18,
    priceUsd: 2447.27,
    available: true,
  },
};

// ---- tiny in-memory store for payment intents ----
// intentId -> { asset, units, to, status, txHash, createdAt }
const intents = new Map();

// ---- helpers ----
const erc20Abi = [
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
];

async function fetchEthPrice() {
  // live price from dexscreener (same source RWA uses)
  try {
    const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73');
    const data = await res.json();
    const pairs = data?.pairs || [];
    const usd = pairs.find(p => p.quoteToken?.symbol === 'USDG') || pairs.find(p => p.priceUsd);
    if (usd && Number(usd.priceUsd) > 0) return Number(usd.priceUsd);
  } catch (_) {}
  return ASSETS.ETH.priceUsd; // fallback
}

function generateIntentId() {
  return 'HC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ---- express ----
const app = express();
app.use(express.json());

// CORS for the landing page
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// GET /api/assets
app.get('/api/assets', (req, res) => {
  res.json({ treasury: TREASURY, assets: Object.values(ASSETS) });
});

// POST /api/quote  { asset: "USDG"|"ETH"|"WETH", amountUsd: number }
app.post('/api/quote', async (req, res) => {
  try {
    const { asset, amountUsd } = req.body || {};
    const meta = ASSETS[asset];
    if (!meta || !meta.available) return res.status(400).json({ error: 'Unsupported asset' });
    const amount = Number(amountUsd);
    if (!Number.isFinite(amount) || amount < 10) {
      return res.status(400).json({ error: 'Minimum load is $10.00' });
    }
    if (amount > 1000) return res.status(400).json({ error: 'Maximum load is $1,000.00 per top-up' });

    // refresh ETH price when needed
    if (meta.kind !== 'stable') {
      meta.priceUsd = await fetchEthPrice();
    }

    // units to send (raw token amount)
    const units = parseUnits(
      (amount / meta.priceUsd).toFixed(meta.decimals),
      meta.decimals
    );

    const intentId = generateIntentId();
    intents.set(intentId, {
      asset,
      units: units.toString(),
      to: TREASURY,
      status: 'pending',
      txHash: null,
      createdAt: Date.now(),
    });

    res.json({
      intent: intentId,
      asset: meta.symbol,
      token_address: meta.address,
      decimals: meta.decimals,
      symbol: meta.symbol,
      priceUsd: meta.priceUsd,
      amountUsd: amount,
      units: units.toString(),
      to: TREASURY,
      // for display
      displayUnits: formatUnits(units, meta.decimals),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/confirm  { intent, txHash }
// Polls until the tx is confirmed and the treasury received the funds.
app.post('/api/confirm', async (req, res) => {
  try {
    const { intent, txHash } = req.body || {};
    const intentData = intents.get(intent);
    if (!intentData) return res.status(404).json({ error: 'Unknown intent' });

    if (intentData.status === 'done') {
      return res.json({ status: 'done', cardId: intentData.cardId });
    }
    if (Date.now() - intentData.createdAt > 15 * 60 * 1000) {
      return res.status(408).json({ status: 'expired', error: 'Payment window expired' });
    }

    // verify on-chain
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
      if (!receipt) {
        return res.status(202).json({ status: 'pending', reason: 'Waiting for confirmation…' });
      }
      if (receipt.status !== 'success') {
        return res.status(202).json({ status: 'pending', reason: 'Transaction not confirmed yet' });
      }

      const meta = ASSETS[intentData.asset];
      let received = false;

      if (meta.address) {
        // ERC20: find Transfer event to treasury with amount >= units
        const logs = receipt.logs || [];
        for (const log of logs) {
          if (log.address && log.address.toLowerCase() === meta.address.toLowerCase()) {
            const topics = log.topics || [];
            if (topics.length >= 3) {
              const from = topics[1]?.slice(-40)?.toLowerCase();
              const to = topics[2]?.slice(-40)?.toLowerCase();
              const amount = BigInt(log.data || '0x0');
              if (to === TREASURY && amount >= BigInt(intentData.units)) {
                received = true;
                break;
              }
            }
          }
        }
      } else {
        // native ETH: check tx.to === treasury and value >= units
        const tx = await publicClient.getTransaction({ hash: txHash });
        if (tx && tx.to && tx.to.toLowerCase() === TREASURY && tx.value >= BigInt(intentData.units)) {
          received = true;
        }
      }

      if (received) {
        intentData.status = 'done';
        intentData.txHash = txHash;
        intentData.cardId = 'card_' + intent.replace(/[^A-Z0-9]/gi, '').toLowerCase();
        return res.json({
          status: 'done',
          cardId: intentData.cardId,
          pendingFundUsd: intentData.amountUsd,
        });
      }

      return res.status(202).json({ status: 'pending', reason: 'Waiting for the network to confirm it…' });
    } catch (e) {
      // tx not yet on chain / rpc hiccup
      return res.status(202).json({ status: 'pending', reason: 'Waiting for the network to confirm it…' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// health
app.get('/health', (req, res) => res.json({ ok: true, chain: 4663, treasury: TREASURY }));

app.listen(PORT, () => {
  console.log(`✅ Hybrid Cash API on :${PORT}`);
  console.log(`   Treasury: ${TREASURY}`);
  console.log(`   Chain:    Robinhood (${hoodChain.id})`);
});
