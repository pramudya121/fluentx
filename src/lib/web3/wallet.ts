import { ethers } from 'ethers';
import { SUPPORTED_NETWORKS, DEFAULT_NETWORK } from './config';

declare global {
  interface Window {
    ethereum?: any;
    okxwallet?: any;
    bitkeep?: any;
  }
}

export type WalletType = 'metamask' | 'okx' | 'bitget';

export async function connectWallet(walletType: WalletType = 'metamask'): Promise<string | null> {
  try {
    let provider;
    
    // Select wallet provider
    switch (walletType) {
      case 'okx':
        if (!window.okxwallet) {
          throw new Error('OKX Wallet not installed');
        }
        provider = window.okxwallet;
        break;
      case 'bitget':
        if (!window.bitkeep?.ethereum) {
          throw new Error('Bitget Wallet not installed');
        }
        provider = window.bitkeep.ethereum;
        break;
      default:
        if (!window.ethereum) {
          throw new Error('MetaMask not installed');
        }
        provider = window.ethereum;
    }

    // Request account access
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    // Check and switch to default network if needed
    const chainId = await getCurrentChainId();
    if (!chainId || !SUPPORTED_NETWORKS[chainId]) {
      await switchNetwork(DEFAULT_NETWORK.chainId, provider);
    }

    return accounts[0];
  } catch (error: any) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
}

export async function switchNetwork(chainId: number, provider?: any): Promise<void> {
  const ethereum = provider || window.ethereum;
  
  if (!ethereum) {
    throw new Error('No wallet provider found');
  }

  const network = SUPPORTED_NETWORKS[chainId];
  if (!network) {
    throw new Error('Unsupported network');
  }

  try {
    // Try to switch to the network first
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainIdHex }],
    });
    console.log(`Successfully switched to ${network.name}`);
  } catch (switchError: any) {
    console.log('Switch error:', switchError);
    
    // Chain not added yet, try to add it (error code 4902)
    if (switchError.code === 4902 || switchError.code === -32603) {
      try {
        console.log(`Adding ${network.name} to wallet...`);
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: network.chainIdHex,
              chainName: network.name,
              nativeCurrency: {
                name: network.nativeCurrency.name,
                symbol: network.nativeCurrency.symbol,
                decimals: network.nativeCurrency.decimals,
              },
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: [network.blockExplorer],
            },
          ],
        });
        console.log(`Successfully added ${network.name}`);
      } catch (addError: any) {
        console.error('Error adding network:', addError);
        throw new Error(addError.message || `Failed to add ${network.name} to wallet. Please add it manually.`);
      }
    } else if (switchError.code === 4001) {
      // User rejected the request
      throw new Error('Network switch rejected by user');
    } else {
      // Other errors
      throw new Error(switchError.message || 'Failed to switch network');
    }
  }
}

// Backward compatibility
export async function switchToFluentTestnet(provider?: any): Promise<void> {
  return switchNetwork(20994, provider);
}

export async function getCurrentChainId(): Promise<number | null> {
  if (!window.ethereum) {
    return null;
  }

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  } catch (error) {
    console.error('Error getting chain ID:', error);
    return null;
  }
}

export async function getSigner(): Promise<ethers.Signer | null> {
  if (!window.ethereum) {
    return null;
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  return await provider.getSigner();
}

export async function getProvider(): Promise<ethers.BrowserProvider | null> {
  if (!window.ethereum) {
    return null;
  }
  
  return new ethers.BrowserProvider(window.ethereum);
}

export function getContract(address: string, abi: any[], signerOrProvider: ethers.Signer | ethers.Provider): ethers.Contract {
  return new ethers.Contract(address, abi, signerOrProvider);
}

export async function getCurrentAccount(): Promise<string | null> {
  if (!window.ethereum) {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error('Error getting current account:', error);
    return null;
  }
}

export function setupAccountChangeListener(callback: (accounts: string[]) => void): () => void {
  if (!window.ethereum) {
    return () => {};
  }

  window.ethereum.on('accountsChanged', callback);
  
  return () => {
    window.ethereum.removeListener('accountsChanged', callback);
  };
}

export function setupChainChangeListener(callback: () => void): () => void {
  if (!window.ethereum) {
    return () => {};
  }

  window.ethereum.on('chainChanged', callback);
  
  return () => {
    window.ethereum.removeListener('chainChanged', callback);
  };
}
