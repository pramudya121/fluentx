import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWeb3 } from '@/contexts/Web3Context';
import { SUPPORTED_NETWORKS, DEFAULT_NETWORK } from '@/lib/web3/config';

interface WrongNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WrongNetworkModal({ isOpen, onClose }: WrongNetworkModalProps) {
  const { switchNetwork, isSwitchingNetwork } = useWeb3();

  const handleSwitchToDefault = async () => {
    await switchNetwork(DEFAULT_NETWORK.chainId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <DialogTitle>Wrong Network</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            You're connected to an unsupported network. Please switch to one of our supported networks to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <p className="text-sm font-medium">Supported Networks:</p>
          {Object.values(SUPPORTED_NETWORKS).map((network) => (
            <div
              key={network.chainId}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div>
                <p className="font-medium">{network.name}</p>
                <p className="text-xs text-muted-foreground">Chain ID: {network.chainId}</p>
              </div>
              <Button
                size="sm"
                onClick={() => switchNetwork(network.chainId)}
                disabled={isSwitchingNetwork}
              >
                Switch
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSwitchToDefault}
            disabled={isSwitchingNetwork}
            className="flex-1"
          >
            {isSwitchingNetwork ? 'Switching...' : `Switch to ${DEFAULT_NETWORK.name}`}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
