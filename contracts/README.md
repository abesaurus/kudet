# AirdropDistributor — Cara Pakai

Contract distributor yang bikin transfer keliatan kayak **airdrop/platform distribution**, bukan wallet-to-wallet.

## Alur

```
Wallet 1 (owner) → deposit token → AirdropDistributor → distribute() → Wallet 2, Wallet 3, ...
```

Di explorer: `Transfer(from=0xCONTRACT, to=Wallet2)` — bukan `from=Wallet1`.

## 1. Deploy

Butuh **ETH buat gas** di wallet 1 (deployer).

```bash
cd /root/hybrid-cash/backend
export PK=0xPRIVATE_KEY_WALLET_1
node ../contracts/deploy-distributor.mjs
```

Hasil: contract address tersimpan di `contracts/distributor.addr`.

## 2. Deposit token ke contract

Wallet 1 (owner) approve + deposit token yang mau didistribusikan.

```js
// approve contract dulu: token.approve(contractAddr, amount)
// lalu panggil:
await contract.write.deposit([tokenAddress, amount]);
```

## 3. Distribute (satu tx, banyak penerima)

```js
const recipients = ['0xWallet2', '0xWallet3', '0xWallet4'];
const amounts = [ethers.parseUnits('100', 18), ethers.parseUnits('200', 18), ethers.parseUnits('50', 18)];

await contract.write.distribute([tokenAddress, recipients, amounts]);
```

Satu tx → explorer nampilin banyak event `Transfer(from=contract, to=recipient)` → keliatan airdrop.

## File

| File | Isi |
|---|---|
| `AirdropDistributor.sol` | Source contract |
| `deploy-distributor.mjs` | Deploy script (viem) |
| `distributor.addr` | Contract address (after deploy) |
| `distributor.json` | Full info + ABI (after deploy) |