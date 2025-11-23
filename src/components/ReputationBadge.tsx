import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, Shield, TrendingUp } from 'lucide-react';

interface ReputationData {
  rating: number;
  total_sales: number;
  total_purchases: number;
  successful_trades: number;
  is_trusted: boolean;
  total_volume: number;
}

interface ReputationBadgeProps {
  walletAddress: string;
  showDetails?: boolean;
}

export default function ReputationBadge({ walletAddress, showDetails = false }: ReputationBadgeProps) {
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReputation();
  }, [walletAddress]);

  async function fetchReputation() {
    try {
      const { data, error } = await supabase
        .from('user_reputation')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setReputation(data);
    } catch (error) {
      console.error('Error fetching reputation:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !reputation) {
    return null;
  }

  const renderStars = () => {
    const stars = [];
    const rating = reputation.rating || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-3 w-3 ${
            i <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
          }`}
        />
      );
    }
    return stars;
  };

  const getBadgeColor = () => {
    const rating = reputation.rating || 0;
    if (reputation.is_trusted) return 'bg-gradient-to-r from-purple-500 to-pink-500';
    if (rating >= 4.5) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    if (rating >= 3.5) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    if (rating >= 2.5) return 'bg-gradient-to-r from-yellow-500 to-orange-500';
    return 'bg-muted';
  };

  const getBadgeLabel = () => {
    if (reputation.is_trusted) return 'Trusted Seller';
    const rating = reputation.rating || 0;
    if (rating >= 4.5) return 'Top Rated';
    if (rating >= 3.5) return 'Verified';
    if (rating >= 2.5) return 'Active';
    return 'New';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-2">
            {reputation.is_trusted && (
              <Badge className={`${getBadgeColor()} text-white border-0`}>
                <Shield className="h-3 w-3 mr-1" />
                {getBadgeLabel()}
              </Badge>
            )}
            {!reputation.is_trusted && reputation.rating > 0 && (
              <Badge variant="secondary" className="gap-1">
                {renderStars()}
                <span className="ml-1 text-xs">
                  ({reputation.rating.toFixed(1)})
                </span>
              </Badge>
            )}
            {showDetails && reputation.successful_trades > 0 && (
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {reputation.successful_trades} trades
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">{getBadgeLabel()}</p>
            <div className="space-y-1">
              <p>Rating: {reputation.rating.toFixed(1)}/5.0</p>
              <p>Total Sales: {reputation.total_sales}</p>
              <p>Total Purchases: {reputation.total_purchases}</p>
              <p>Successful Trades: {reputation.successful_trades}</p>
              <p>Total Volume: {reputation.total_volume.toFixed(2)} ETH</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
