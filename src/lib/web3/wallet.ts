import { ethers } from 'ethers';
import { FLUENT_TESTNET } from './config';

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

    // Check and switch to FLUENT testnet
    await switchToFluentTestnet(provider);

    return accounts[0];
  } catch (error: any) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
}

export async function switchToFluentTestnet(provider?: any): Promise<void> {
  const ethereum = provider || window.ethereum;
  
  if (!ethereum) {
    throw new Error('No wallet provider found');
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: FLUENT_TESTNET.chainIdHex }],
    });
  } catch (switchError: any) {
    // Chain not added, add it
    if (switchError.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: FLUENT_TESTNET.chainIdHex,
              chainName: FLUENT_TESTNET.name,
              nativeCurrency: FLUENT_TESTNET.nativeCurrency,
              rpcUrls: [FLUENT_TESTNET.rpcUrl],
              blockExplorerUrls: [FLUENT_TESTNET.blockExplorer],
            },
          ],
        });
      } catch (addError) {
        throw new Error('Failed to add FLUENT Testnet to wallet');
      }
    } else {
      throw switchError;
    }
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
