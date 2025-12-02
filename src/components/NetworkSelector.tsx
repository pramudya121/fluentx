import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Network, Loader2 } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';
import { SUPPORTED_NETWORKS } from '@/lib/web3/config';
import { cn } from '@/lib/utils';

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
          className={cn(
            "gap-2 transition-all duration-300",
            isSwitchingNetwork && "animate-pulse"
          )}
          disabled={isSwitchingNetwork}
        >
          {isSwitchingNetwork ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Network className="w-4 h-4" />
          )}
          <span className="hidden sm:inline transition-opacity duration-200">
            {isSwitchingNetwork ? 'Switching...' : currentNetwork ? currentNetwork.name : 'Select Network'}
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 opacity-50 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 animate-scale-in">
        {Object.values(SUPPORTED_NETWORKS).map((network) => (
          <DropdownMenuItem
            key={network.chainId}
            onClick={() => handleNetworkSwitch(network.chainId)}
            className={cn(
              "flex items-center justify-between cursor-pointer transition-all duration-200",
              currentChainId === network.chainId && "bg-primary/10"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                currentChainId === network.chainId ? "bg-primary animate-pulse" : "bg-muted"
              )} />
              <Network className="w-4 h-4" />
              <span>{network.name}</span>
            </div>
            {currentChainId === network.chainId && (
              <Badge variant="default" className="bg-primary animate-fade-in">Active</Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
