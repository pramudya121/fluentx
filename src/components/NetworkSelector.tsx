import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Network } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';
import { SUPPORTED_NETWORKS } from '@/lib/web3/config';

export default function NetworkSelector() {
  const { currentChainId, switchNetwork, isSwitchingNetwork } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);

  const currentNetwork = currentChainId ? SUPPORTED_NETWORKS[currentChainId] : null;

  const handleNetworkSwitch = async (chainId: number) => {
    setIsOpen(false);
    await switchNetwork(chainId);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2"
          disabled={isSwitchingNetwork}
        >
          <Network className="w-4 h-4" />
          <span className="hidden sm:inline">
            {currentNetwork ? currentNetwork.name : 'Select Network'}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {Object.values(SUPPORTED_NETWORKS).map((network) => (
          <DropdownMenuItem
            key={network.chainId}
            onClick={() => handleNetworkSwitch(network.chainId)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              <span>{network.name}</span>
            </div>
            {currentChainId === network.chainId && (
              <Badge variant="default" className="bg-primary">Active</Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
