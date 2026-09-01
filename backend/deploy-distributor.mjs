/**
 * Deploy AirdropDistributor ke Robinhood Chain 4663
 *
 * Usage (dari folder backend/ karena viem ada di sini):
 *   export PK=0xPRIVATE_KEY_WALLET_1
 *   node deploy-distributor.mjs
 *
 * Output: contract address, disimpan ke ../contracts/distributor.addr
 */

import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync, writeFileSync } from 'fs';

const hood = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
});

const publicClient = createPublicClient({ chain: hood, transport: http() });

// Baca bytecode + ABI dari hasil compile
const BYTECODE = '0x' + readFileSync('../contracts/build/AirdropDistributor_sol_AirdropDistributor.bin', 'utf-8').trim();
const ABI = JSON.parse(readFileSync('../contracts/build/AirdropDistributor_sol_AirdropDistributor.abi', 'utf-8'));

const PK = process.env.PK;
if (!PK) { console.error('❌ Set PK=0x... environment variable'); process.exit(1); }

const account = privateKeyToAccount(PK.startsWith('0x') ? PK : '0x' + PK);
const wallet = createWalletClient({ account, chain: hood, transport: http() });

console.log('Deploying AirdropDistributor from:', account.address);
console.log('Bytecode length:', BYTECODE.length, 'hex chars');

const hash = await wallet.deployContract({
  abi: ABI,
  bytecode: BYTECODE,
  args: [],
});

console.log('Tx hash:', hash);
console.log('Waiting for confirmation...');
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log('✅ Contract deployed at:', receipt.contractAddress);

writeFileSync('../contracts/distributor.addr', receipt.contractAddress + '\n');
writeFileSync('../contracts/distributor.json', JSON.stringify({
  address: receipt.contractAddress,
  deployer: account.address,
  chain: 'Robinhood 4663',
  tx: hash,
  blockNumber: Number(receipt.blockNumber),
  abi: ABI,
}, null, 2) + '\n');
console.log('📁 Saved to contracts/distributor.addr + contracts/distributor.json');