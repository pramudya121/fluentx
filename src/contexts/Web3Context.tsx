import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connectWallet, getCurrentAccount, setupAccountChangeListener, setupChainChangeListener, WalletType, getCurrentChainId, switchNetwork as switchNetworkUtil } from '@/lib/web3/wallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SUPPORTED_NETWORKS } from '@/lib/web3/config';

interface Web3ContextType {
  account: string | null;
  currentChainId: number | null;
  isConnecting: boolean;
  isSwitchingNetwork: boolean;
  connect: (walletType?: WalletType) => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  isNetworkSupported: boolean;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [isNetworkSupported, setIsNetworkSupported] = useState(true);

  useEffect(() => {
    // Check if already connected and get chain ID
    const initWeb3 = async () => {
      const acc = await getCurrentAccount();
      setAccount(acc);
      
      const chainId = await getCurrentChainId();
      setCurrentChainId(chainId);
      
      if (chainId) {
        const supported = !!SUPPORTED_NETWORKS[chainId];
        setIsNetworkSupported(supported);
        if (!supported) {
          toast.warning('You are connected to an unsupported network');
        }
      }
    };

    initWeb3();

    // Setup listeners
    const removeAccountListener = setupAccountChangeListener((accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
      } else {
        setAccount(accounts[0]);
      }
    });

    const removeChainListener = setupChainChangeListener(async () => {
      const chainId = await getCurrentChainId();
      setCurrentChainId(chainId);
      
      if (chainId) {
        const supported = !!SUPPORTED_NETWORKS[chainId];
        setIsNetworkSupported(supported);
        if (!supported) {
          toast.warning('You are connected to an unsupported network');
        } else {
          toast.success(`Switched to ${SUPPORTED_NETWORKS[chainId].name}`);
        }
      }
    });

    return () => {
      removeAccountListener();
      removeChainListener();
    };
  }, []);

  useEffect(() => {
    // Create or update profile when account changes
    if (account) {
      supabase
        .from('profiles')
        .upsert({
          wallet_address: account.toLowerCase(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        })
        .then(({ error }) => {
          if (error) {
            console.error('Error creating/updating profile:', error);
          }
        });
    }
  }, [account]);

  const connect = async (walletType: WalletType = 'metamask') => {
    setIsConnecting(true);
    try {
      const address = await connectWallet(walletType);
      if (address) {
        setAccount(address);
        const chainId = await getCurrentChainId();
        setCurrentChainId(chainId);
        
        if (chainId) {
          const supported = !!SUPPORTED_NETWORKS[chainId];
          setIsNetworkSupported(supported);
          if (!supported) {
            toast.warning('Connected to unsupported network. Please switch network.');
          } else {
            toast.success(`Wallet connected to ${SUPPORTED_NETWORKS[chainId].name}!`);
          }
        } else {
          toast.success('Wallet connected successfully!');
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setCurrentChainId(null);
    toast.info('Wallet disconnected');
  };

  const switchNetwork = async (chainId: number) => {
    setIsSwitchingNetwork(true);
    try {
      await switchNetworkUtil(chainId);
      const newChainId = await getCurrentChainId();
      setCurrentChainId(newChainId);
      
      if (newChainId === chainId) {
        setIsNetworkSupported(true);
        toast.success(`Switched to ${SUPPORTED_NETWORKS[chainId].name}`);
      }
    } catch (error: any) {
      console.error('Error switching network:', error);
      toast.error(error.message || 'Failed to switch network');
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  return (
    <Web3Context.Provider 
      value={{ 
        account, 
        currentChainId,
        isConnecting, 
        isSwitchingNetwork,
        connect, 
        disconnect,
        switchNetwork,
        isNetworkSupported
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
