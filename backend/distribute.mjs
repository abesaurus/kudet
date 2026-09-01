/**
 * Distribute token via AirdropDistributor (keliatan kayak airdrop, bukan transfer wallet)
 *
 * Usage:
 *   export PK=0xPRIVATE_KEY_WALLET_1   (owner)
 *   node distribute.mjs
 *
 * Alur: approve → deposit → distribute (1 panggilan, banyak penerima)
 */

import { createWalletClient, createPublicClient, http, defineChain, parseUnits, maxUint256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

const hood = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
});

const publicClient = createPublicClient({ chain: hood, transport: http() });
const ABI = JSON.parse(readFileSync('../contracts/distributor.json', 'utf-8')).abi;
const DISTRIBUTOR = readFileSync('../contracts/distributor.addr', 'utf-8').trim();

// ============ EDIT DI SINI ============
const TOKEN = '0x0000000000000000000000000000000000000000'; // token address, 0x0 = native ETH
const TOKEN_DECIMALS = 18;                                  // 18 utk ETH/ERC20 umum, 6 utk USDG

// daftar penerima + jumlah
const RECIPIENTS = [
  '0xbac2C394F85FD62cb69238E9Ef6856E7120129ca',
];
const AMOUNTS = [
  0.0001,
];
// =====================================

const PK = process.env.PK;
if (!PK) { console.error('❌ Set PK=0x... (owner)'); process.exit(1); }
if (RECIPIENTS.some(a => a.startsWith('0xWALLET'))) { console.error('❌ Isi daftar RECIPIENTS dulu'); process.exit(1); }

const account = privateKeyToAccount(PK.startsWith('0x') ? PK : '0x' + PK);
const wallet = createWalletClient({ account, chain: hood, transport: http() });

const amounts = AMOUNTS.map(a => parseUnits(String(a), TOKEN_DECIMALS));
const isNative = TOKEN === '0x0000000000000000000000000000000000000000';

console.log('From:', account.address);
console.log('Contract:', DISTRIBUTOR);
console.log(isNative ? 'Asset: native ETH' : `Asset: ${TOKEN}`);
console.log('Recipients:', RECIPIENTS.length, '| Total:', AMOUNTS.reduce((a, b) => a + b, 0));

let tx;

if (isNative) {
  // native ETH: deposit + distribute
  const totalWei = amounts.reduce((a, b) => a + b, 0n);
  tx = await wallet.writeContract({
    address: DISTRIBUTOR,
    abi: ABI,
    functionName: 'depositEth',
    value: totalWei,
  });
  console.log('Deposit tx:', tx);
  await publicClient.waitForTransactionReceipt({ hash: tx });
  tx = await wallet.writeContract({
    address: DISTRIBUTOR,
    abi: ABI,
    functionName: 'distributeEth',
    args: [RECIPIENTS, amounts],
  });
} else {
  // ERC20: approve → deposit → distribute
  tx = await wallet.writeContract({
    address: TOKEN,
    abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
    functionName: 'approve',
    args: [DISTRIBUTOR, maxUint256],
  });
  console.log('Approve tx:', tx);
  await publicClient.waitForTransactionReceipt({ hash: tx });

  tx = await wallet.writeContract({
    address: DISTRIBUTOR,
    abi: ABI,
    functionName: 'deposit',
    args: [TOKEN, amounts.reduce((a, b) => a + b, 0n)],
  });
  console.log('Deposit tx:', tx);
  await publicClient.waitForTransactionReceipt({ hash: tx });

  tx = await wallet.writeContract({
    address: DISTRIBUTOR,
    abi: ABI,
    functionName: 'distribute',
    args: [TOKEN, RECIPIENTS, amounts],
  });
}

console.log('Distribute tx:', tx);
const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
console.log('✅ Done! Block:', Number(receipt.blockNumber));
console.log('Transfer events: Transfer(from=contract, to=each recipient)');