import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWeb3 } from '@/contexts/Web3Context';
import { Wallet, Loader2 } from 'lucide-react';
import { WalletType } from '@/lib/web3/wallet';

interface WalletOption {
  type: WalletType;
  name: string;
  icon: string;
  description: string;
}

const walletOptions: WalletOption[] = [
  {
    type: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Connect using MetaMask browser extension',
  },
  {
    type: 'okx',
    name: 'OKX Wallet',
    icon: '⭕',
    description: 'Connect using OKX Wallet',
  },
  {
    type: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    description: 'Connect using Coinbase Wallet',
  },
];

interface WalletSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WalletSelector({ open, onOpenChange }: WalletSelectorProps) {
  const { connect } = useWeb3();
  const [connecting, setConnecting] = useState<WalletType | null>(null);

  const handleConnect = async (walletType: WalletType) => {
    setConnecting(walletType);
    try {
      await connect(walletType);
      onOpenChange(false);
    } catch (error) {
      // Error is already handled in the connect function
    } finally {
      setConnecting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Choose your preferred wallet to connect to Sakura NFT Marketplace
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {walletOptions.map((wallet) => (
            <Button
              key={wallet.type}
              variant="outline"
              className="h-auto p-4 justify-start hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => handleConnect(wallet.type)}
              disabled={connecting !== null}
            >
              <div className="flex items-center gap-4 w-full">
                <div className="text-3xl">{wallet.icon}</div>
                <div className="flex-1 text-left">
                  <div className="font-semibold flex items-center gap-2">
                    {wallet.name}
                    {connecting === wallet.type && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{wallet.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground text-center">
          By connecting your wallet, you agree to our Terms of Service and Privacy Policy
        </div>
      </DialogContent>
    </Dialog>
  );
}
