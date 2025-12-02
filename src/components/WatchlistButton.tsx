import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Heart, Loader2, Bell } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WatchlistButtonProps {
  nftId: string;
  className?: string;
}

export default function WatchlistButton({ nftId, className }: WatchlistButtonProps) {
  const { account } = useWeb3();
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
  const [priceAlert, setPriceAlert] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (account) {
      checkWatchlistStatus();
    }
  }, [account, nftId]);

  async function checkWatchlistStatus() {
    if (!account) return;

    try {
      setChecking(true);
      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('wallet_address', account.toLowerCase())
        .single();

      if (!profile) return;

      // Check if NFT is in watchlist
      const { data: watchlist } = await supabase
        .from('watchlist')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('nft_id', nftId)
        .single();

      if (watchlist) {
        setIsWatchlisted(true);
        setWatchlistId(watchlist.id);
        setPriceAlert(watchlist.price_alert || '');
      }
    } catch (error) {
      // Not in watchlist
    } finally {
      setChecking(false);
    }
  }

  async function toggleWatchlist() {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      // Get or create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('wallet_address', account.toLowerCase())
        .single();

      if (profileError) {
        // Create profile if doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ wallet_address: account.toLowerCase() })
          .select('id')
          .single();

        if (createError) throw createError;
        
        if (newProfile) {
          await addToWatchlist(newProfile.id);
        }
      } else if (profile) {
        if (isWatchlisted && watchlistId) {
          await removeFromWatchlist();
        } else {
          await addToWatchlist(profile.id);
        }
      }
    } catch (error: any) {
      console.error('Error toggling watchlist:', error);
      toast.error('Failed to update watchlist');
    } finally {
      setLoading(false);
    }
  }

  async function addToWatchlist(profileId: string) {
    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        profile_id: profileId,
        nft_id: nftId,
        price_alert: priceAlert || null,
      })
      .select('id')
      .single();

    if (error) throw error;

    setIsWatchlisted(true);
    setWatchlistId(data.id);
    toast.success('Added to watchlist!');
  }

  async function removeFromWatchlist() {
    if (!watchlistId) return;

    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', watchlistId);

    if (error) throw error;

    setIsWatchlisted(false);
    setWatchlistId(null);
    setPriceAlert('');
    toast.success('Removed from watchlist');
  }

  async function updatePriceAlert(newAlert: string) {
    if (!watchlistId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('watchlist')
        .update({ price_alert: newAlert || null })
        .eq('id', watchlistId);

      if (error) throw error;

      setPriceAlert(newAlert);
      toast.success('Price alert updated!');
    } catch (error) {
      console.error('Error updating price alert:', error);
      toast.error('Failed to update price alert');
    } finally {
      setLoading(false);
    }
  }

  if (!account) return null;

  if (checking) {
    return (
      <Button variant="outline" size="icon" disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'transition-all',
            isWatchlisted && 'text-red-500 hover:text-red-600 border-red-500/50',
            className
          )}
        >
          <Heart className={cn('w-4 h-4', isWatchlisted && 'fill-current')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 glass-card">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Watchlist</h4>
            <p className="text-sm text-muted-foreground">
              Add this NFT to your watchlist and set price alerts
            </p>
          </div>
          <div className="space-y-3">
            <Button
              onClick={toggleWatchlist}
              disabled={loading}
              className="w-full"
              variant={isWatchlisted ? 'destructive' : 'default'}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Heart className={cn('w-4 h-4 mr-2', isWatchlisted && 'fill-current')} />
              )}
              {isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </Button>
            
            {isWatchlisted && (
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="price-alert" className="flex items-center gap-2 text-sm">
                  <Bell className="w-3 h-3" />
                  Price Alert (ETH)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="price-alert"
                    type="number"
                    step="0.001"
                    placeholder="e.g., 0.5"
                    value={priceAlert}
                    onChange={(e) => setPriceAlert(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => updatePriceAlert(priceAlert)}
                    disabled={loading}
                  >
                    Set
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get notified when the price drops to or below this value
                </p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
