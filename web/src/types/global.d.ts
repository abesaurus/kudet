// Minimal EIP-1193 provider typing for the checkout modal.
interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<any>;
  isMetaMask?: boolean;
}

interface Window {
  ethereum?: EthereumProvider;
}
