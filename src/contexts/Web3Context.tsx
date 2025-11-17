import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connectWallet, getCurrentAccount, setupAccountChangeListener, setupChainChangeListener, WalletType } from '@/lib/web3/wallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Web3ContextType {
  account: string | null;
  isConnecting: boolean;
  connect: (walletType?: WalletType) => Promise<void>;
  disconnect: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check if already connected
    getCurrentAccount().then(setAccount);

    // Setup listeners
    const removeAccountListener = setupAccountChangeListener((accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
      } else {
        setAccount(accounts[0]);
      }
    });

    const removeChainListener = setupChainChangeListener(() => {
      window.location.reload();
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
        toast.success('Wallet connected successfully!');
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
    toast.info('Wallet disconnected');
  };

  return (
    <Web3Context.Provider value={{ account, isConnecting, connect, disconnect }}>
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
