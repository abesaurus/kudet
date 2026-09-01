// e2e test: deploy HybridToken + HybridLending, seed, borrow, repay, verify.
// Run: node test-e2e.mjs
import { createPublicClient, createWalletClient, http, parseEther, parseUnits, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// anvil default accounts
const DEPLOYER_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const USER_PK    = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const KEEPER_PK  = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';

const account0 = privateKeyToAccount(DEPLOYER_PK);
const account1 = privateKeyToAccount(USER_PK);
const account2 = privateKeyToAccount(KEEPER_PK);

const transport = http('http://127.0.0.1:8545');
const publicClient = createPublicClient({ transport });
const wallet = createWalletClient({ transport, account: account0 });
const walletUser = createWalletClient({ transport, account: account1 });
const walletKeeper = createWalletClient({ transport, account: account2 });

// Read compiled artifacts
function readContract(name) {
  const abi = JSON.parse(fs.readFileSync(path.join(__dirname, 'build', `${name}.abi`), 'utf8'));
  const bin = fs.readFileSync(path.join(__dirname, 'build', `${name}.bin`), 'utf8');
  return { abi, bin };
}

const HybridToken = readContract('HybridToken_HybridToken');
const HybridLending = readContract('HybridLending_HybridLending');
const ERC20Min = readContract('HybridLending_IERC20Min');

// deploy a minimal ERC-20 for USDG mock
async function deployUsdg() {
  const factory = new ContractFactory(
    ['function totalSupply() view returns (uint256)', 'function balanceOf(address) view returns (uint256)',
     'function transfer(address,uint256) returns (bool)', 'function transferFrom(address,address,uint256) returns (bool)',
     'function approve(address,uint256) returns (bool)', 'function allowance(address,address) view returns (uint256)',
     'function mint(address,uint256)'],
    // Simple bytecode: ERC-20 with mint
    // We'll use the HybridToken as our USDG mock (rename symbol)
    // Actually let me just deploy a fresh HybridToken for USDG mock
  );
  // Actually the simplest: deploy HybridToken and call it USDG
  const hash = await wallet.deployContract({
    abi: HybridToken.abi,
    bytecode: ('0x' + HybridToken.bin),
    args: [0n],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('USDG (mock) deployed:', receipt.contractAddress);
  return { address: receipt.contractAddress, abi: HybridToken.abi };
}

async function main() {
  console.log('═══ HYBRID LENDING E2E TEST ═══\n');
  const deployer = account0.address;
  const user = account1.address;
  const keeper = account2.address;

  // 1. Deploy HYBRID token
  console.log('1. Deploy HybridToken...');
  let hash = await wallet.deployContract({
    abi: HybridToken.abi,
    bytecode: ('0x' + HybridToken.bin),
    args: [parseEther('1000000')], // 1M initial supply
  });
  let receipt = await publicClient.waitForTransactionReceipt({ hash });
  const tokenAddr = receipt.contractAddress;
  console.log('   HYBRID token:', tokenAddr);

  // 2. Deploy mock USDG
  console.log('\n2. Deploy mock USDG...');
  hash = await wallet.deployContract({
    abi: HybridToken.abi,
    bytecode: ('0x' + HybridToken.bin),
    args: [parseEther('1000000')],
  });
  receipt = await publicClient.waitForTransactionReceipt({ hash });
  const usdgAddr = receipt.contractAddress;
  console.log('   USDG (mock):', usdgAddr);

  // 3. Deploy HybridLending
  console.log('\n3. Deploy HybridLending...');
  hash = await wallet.deployContract({
    abi: HybridLending.abi,
    bytecode: ('0x' + HybridLending.bin),
    args: [deployer],
  });
  receipt = await publicClient.waitForTransactionReceipt({ hash });
  const lendingAddr = receipt.contractAddress;
  console.log('   Lending (proxy):', lendingAddr);

  // 4. Initialize lending
  console.log('\n4. Initialize...');
  hash = await wallet.writeContract({
    address: lendingAddr, abi: HybridLending.abi, functionName: 'initialize',
    args: [tokenAddr, usdgAddr, parseEther('100000')], // debt cap 100k USDG
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('   Initialized: debtCap=100k, fee=3%, LTV=50%');

  // 5. Set keeper
  hash = await wallet.writeContract({
    address: lendingAddr, abi: HybridLending.abi, functionName: 'setKeeper',
    args: [keeper],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('   Keeper set:', keeper);

  // 6. Transfer HYBRID to user
  console.log('\n5. Fund user with HYBRID...');
  hash = await wallet.writeContract({
    address: tokenAddr, abi: HybridToken.abi, functionName: 'transfer',
    args: [user, parseEther('10000')],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('   User got 10,000 HYBRID');

  // 7. Seed USDG into vault
  console.log('\n6. Seed USDG into vault...');
  hash = await wallet.writeContract({
    address: usdgAddr, abi: HybridToken.abi, functionName: 'transfer',
    args: [lendingAddr, parseEther('50000')],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('   Vault seeded: 50,000 USDG');

  // 8. Set price samples (keeper)
  console.log('\n7. Set price samples...');
  const price = parseEther('0.5'); // 0.5 USDG per HYBRID
  for (let i = 0; i < 3; i++) {
    hash = await walletKeeper.writeContract({
      address: lendingAddr, abi: HybridLending.abi, functionName: 'setPriceSample',
      args: [price],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    // wait for cooldown (60s) — skip for test, enable via evm_increaseTime
    // for speed: manually increase time
    await publicClient.request({ method: 'evm_increaseTime', params: [61] });
    await publicClient.request({ method: 'evm_mine', params: [] });
  }
  console.log('   3 samples set @ 0.5 USDG/HYBRID');

  // Verify price
  const p = await publicClient.readContract({ address: lendingAddr, abi: HybridLending.abi, functionName: 'price' });
  console.log('   Protected price:', formatEther(p), 'USDG/HYBRID (95% of 0.5 = 0.475)');

  // 9. User approves HYBRID + deposits + borrows
  console.log('\n8. User deposits 5,000 HYBRID + borrows...');
  hash = await walletUser.writeContract({
    address: tokenAddr, abi: HybridToken.abi, functionName: 'approve',
    args: [lendingAddr, parseEther('5000')],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  hash = await walletUser.writeContract({
    address: lendingAddr, abi: HybridLending.abi, functionName: 'depositAndBorrow',
    args: [parseEther('5000')],
  });
  receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('   Tx hash:', hash);

  // 10. Verify position
  console.log('\n9. Verify position...');
  const pos = await publicClient.readContract({
    address: lendingAddr, abi: HybridLending.abi, functionName: 'positions',
    args: [user],
  });
  console.log('   Collateral:', formatEther(pos[0]), 'HYBRID');
  console.log('   Debt:', formatEther(pos[1]), 'USDG');

  // Verify collateral value: 5000 HYBRID × 0.475 = 2375 USDG
  // Max borrow at 50% LTV = 2375/2 = 1187.5 USDG
  // Fee 3% = 35.625, net = 1151.875
  console.log('   Expected: collateral=5000, debt≈1187.5, net≈1151.9');

  // Check user USDG balance
  const usdgBal = await publicClient.readContract({ address: usdgAddr, abi: HybridToken.abi, functionName: 'balanceOf', args: [user] });
  console.log('   User USDG balance:', formatEther(usdgBal));

  // 11. Approve USDG + repay
  console.log('\n10. Repay 500 USDG + redeem...');
  hash = await walletUser.writeContract({
    address: usdgAddr, abi: HybridToken.abi, functionName: 'approve',
    args: [lendingAddr, parseEther('500')],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  hash = await walletUser.writeContract({
    address: lendingAddr, abi: HybridLending.abi, functionName: 'repayAndRedeemProportionally',
    args: [parseEther('500')],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  const pos2 = await publicClient.readContract({
    address: lendingAddr, abi: HybridLending.abi, functionName: 'positions',
    args: [user],
  });
  console.log('   Remaining collateral:', formatEther(pos2[0]), 'HYBRID');
  console.log('   Remaining debt:', formatEther(pos2[1]), 'USDG');
  console.log('   Expected: debt≈687.5, collateral≈2894.7');

  // 12. Full repay
  console.log('\n11. Full repay...');
  const debt = pos2[1];
  hash = await walletUser.writeContract({
    address: usdgAddr, abi: HybridToken.abi, functionName: 'approve',
    args: [lendingAddr, debt],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  hash = await walletUser.writeContract({
    address: lendingAddr, abi: HybridLending.abi, functionName: 'repayAndRedeemProportionally',
    args: [debt],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  const pos3 = await publicClient.readContract({
    address: lendingAddr, abi: HybridLending.abi, functionName: 'positions',
    args: [user],
  });
  console.log('   Final collateral:', formatEther(pos3[0]), 'HYBRID');
  console.log('   Final debt:', formatEther(pos3[1]), 'USDG');

  const success = pos3[0] === 0n && pos3[1] === 0n;
  console.log('\n═══ RESULT: ' + (success ? '✅ ALL PASSED' : '❌ FAILED') + ' ═══');
  process.exit(success ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });