import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWeb3 } from '@/contexts/Web3Context';
import { SUPPORTED_NETWORKS } from '@/lib/web3/config';
import { getNetworkStats } from '@/lib/web3/networkStats';
import { Activity, Fuel, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkStats {
  gasPrice: string;
  blockTime: string;
  blockNumber: number;
}

export default function NetworkStatus() {
  const { currentChainId } = useWeb3();
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);

  const currentNetwork = currentChainId ? SUPPORTED_NETWORKS[currentChainId] : null;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchStats = async () => {
      if (!currentChainId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const networkStats = await getNetworkStats(currentChainId);
        setStats(networkStats);
      } catch (error) {
        console.error('Error fetching network stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Update stats every 15 seconds
    interval = setInterval(fetchStats, 15000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentChainId]);

  if (!currentNetwork || loading) {
    return null;
  }

  return (
    <Card className={cn(
      "glass-card border-0 p-4 transition-all duration-300 animate-fade-in",
      "hover:shadow-sakura"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium">Network Status</span>
        </div>
        <Badge variant="outline" className="animate-scale-in">
          {currentNetwork.name}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-background/50 transition-all duration-200 hover:bg-background/70">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Activity className="w-3 h-3" />
            <span className="text-xs">Block</span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {stats?.blockNumber.toLocaleString() || '-'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-background/50 transition-all duration-200 hover:bg-background/70">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Fuel className="w-3 h-3" />
            <span className="text-xs">Gas</span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {stats?.gasPrice || '-'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-background/50 transition-all duration-200 hover:bg-background/70">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-xs">Time</span>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {stats?.blockTime || '-'}
          </span>
        </div>
      </div>
    </Card>
  );
}
