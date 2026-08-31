// Generate a fresh Hybrid Cash treasury wallet
import { randomBytes } from 'crypto';
import { privateKeyToAccount } from 'viem/accounts';
import { writeFileSync, mkdirSync } from 'fs';

// 32 random bytes -> private key
const pk = '0x' + randomBytes(32).toString('hex');
const account = privateKeyToAccount(pk);

const out = {
  chain: 'Robinhood (Hood Chain 4663)',
  rpc: 'https://rpc.mainnet.chain.robinhood.com',
  address: account.address,
  privateKey: pk,
  created: new Date().toISOString(),
  note: 'Hybrid Cash treasury - receives user deposits for card top-ups',
};

mkdirSync('/root/.secrets/hybrid-cash', { recursive: true });
writeFileSync('/root/.secrets/hybrid-cash/treasury.json', JSON.stringify(out, null, 2) + '\n', { mode: 0o600 });
// also store just the address for quick reference
writeFileSync('/root/.secrets/hybrid-cash/treasury.addr', account.address + '\n', { mode: 0o600 });
// and pk.txt for the viem wallet pattern
writeFileSync('/root/.secrets/hybrid-cash/pk.txt', pk.replace('0x', '') + '\n', { mode: 0o600 });

console.log('ADDRESS:', account.address);
console.log('SAVED to /root/.secrets/hybrid-cash/');
