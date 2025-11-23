import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Users, Crown, Star } from 'lucide-react';
import ReputationBadge from '@/components/ReputationBadge';

interface LeaderboardEntry {
  address: string;
  username?: string;
  count: number;
  totalValue?: number;
}

export default function Leaderboard() {
  const [topCollectors, setTopCollectors] = useState<LeaderboardEntry[]>([]);
  const [topSellers, setTopSellers] = useState<LeaderboardEntry[]>([]);
  const [topByVolume, setTopByVolume] = useState<LeaderboardEntry[]>([]);
  const [topByRarity, setTopByRarity] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'all'>('all');

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  async function fetchLeaderboards() {
    try {
      const dateFilter = getDateFilter();
      
      // Top Collectors (most NFTs owned)
      const { data: collectors, error: collectorsError } = await supabase
        .from('nfts')
        .select('owner_address')
        .then(({ data, error }) => {
          if (error) throw error;
          const counts: Record<string, number> = {};
          data?.forEach(nft => {
            counts[nft.owner_address] = (counts[nft.owner_address] || 0) + 1;
          });
          const sorted = Object.entries(counts)
            .map(([address, count]) => ({ address, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
          return { data: sorted, error: null };
        });

      // Top Sellers (most sales completed)
      let sellersQuery = supabase
        .from('transactions')
        .select('from_address, price')
        .eq('type', 'sale');
      
      if (dateFilter) {
        sellersQuery = sellersQuery.gte('created_at', dateFilter);
      }

      const { data: sellers, error: sellersError } = await sellersQuery
        .then(({ data, error }) => {
          if (error) throw error;
          const sales: Record<string, { count: number; totalValue: number }> = {};
          data?.forEach(tx => {
            if (!sales[tx.from_address]) {
              sales[tx.from_address] = { count: 0, totalValue: 0 };
            }
            sales[tx.from_address].count++;
            sales[tx.from_address].totalValue += parseFloat(tx.price || '0');
          });
          const sorted = Object.entries(sales)
            .map(([address, stats]) => ({ address, ...stats }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
          return { data: sorted, error: null };
        });

      // Top by Volume
      let volumeQuery = supabase
        .from('transactions')
        .select('from_address, price')
        .eq('type', 'sale');
      
      if (dateFilter) {
        volumeQuery = volumeQuery.gte('created_at', dateFilter);
      }

      const { data: volumeData } = await volumeQuery
        .then(({ data, error }) => {
          if (error) throw error;
          const volumes: Record<string, number> = {};
          data?.forEach(tx => {
            volumes[tx.from_address] = (volumes[tx.from_address] || 0) + parseFloat(tx.price || '0');
          });
          const sorted = Object.entries(volumes)
            .map(([address, totalValue]) => ({ address, count: 0, totalValue }))
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 10);
          return { data: sorted, error: null };
        });

      // Top by Rarity (users with highest avg rarity)
      const { data: rarityData } = await supabase
        .from('nfts')
        .select('owner_address, rarity_score')
        .then(({ data, error }) => {
          if (error) throw error;
          const rarity: Record<string, { total: number; count: number }> = {};
          data?.forEach(nft => {
            if (!rarity[nft.owner_address]) {
              rarity[nft.owner_address] = { total: 0, count: 0 };
            }
            rarity[nft.owner_address].total += nft.rarity_score || 0;
            rarity[nft.owner_address].count++;
          });
          const sorted = Object.entries(rarity)
            .map(([address, stats]) => ({ 
              address, 
              count: stats.count,
              totalValue: stats.total / stats.count 
            }))
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 10);
          return { data: sorted, error: null };
        });

      // Get usernames for addresses
      if (collectors || sellers || volumeData || rarityData) {
        const allAddresses = [
          ...(collectors || []).map(c => c.address),
          ...(sellers || []).map(s => s.address),
          ...(volumeData || []).map(v => v.address),
          ...(rarityData || []).map(r => r.address)
        ];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('wallet_address, username')
          .in('wallet_address', allAddresses);

        const usernameMap: Record<string, string> = {};
        profiles?.forEach(p => {
          if (p.username) usernameMap[p.wallet_address] = p.username;
        });

        setTopCollectors((collectors || []).map(c => ({
          ...c,
          username: usernameMap[c.address]
        })));

        setTopSellers((sellers || []).map(s => ({
          ...s,
          username: usernameMap[s.address]
        })));

        setTopByVolume((volumeData || []).map(v => ({
          ...v,
          username: usernameMap[v.address]
        })));

        setTopByRarity((rarityData || []).map(r => ({
          ...r,
          username: usernameMap[r.address]
        })));
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  }

  function getDateFilter() {
    const now = new Date();
    if (timeframe === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return weekAgo.toISOString();
    } else if (timeframe === 'monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return monthAgo.toISOString();
    }
    return null;
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number, showValue = false, valueLabel = 'ETH') => (
    <div key={entry.address} className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center font-bold text-white">
          {index + 1 <= 3 ? getMedalEmoji(index + 1) : index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{entry.username || formatAddress(entry.address)}</p>
            <ReputationBadge walletAddress={entry.address} />
          </div>
          <p className="text-xs text-muted-foreground font-mono">{formatAddress(entry.address)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-lg text-primary">{entry.count}</p>
        {showValue && entry.totalValue !== undefined && (
          <p className="text-sm text-muted-foreground">
            {entry.totalValue.toFixed(2)} {valueLabel}
          </p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Leaderboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Top collectors and sellers in the marketplace
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={timeframe === 'weekly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setTimeframe('weekly');
              fetchLeaderboards();
            }}
          >
            Weekly
          </Button>
          <Button
            variant={timeframe === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setTimeframe('monthly');
              fetchLeaderboards();
            }}
          >
            Monthly
          </Button>
          <Button
            variant={timeframe === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setTimeframe('all');
              fetchLeaderboards();
            }}
          >
            All Time
          </Button>
        </div>

        <Tabs defaultValue="collectors" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="collectors" className="gap-2">
              <Users className="w-4 h-4" />
              Collectors
            </TabsTrigger>
            <TabsTrigger value="sellers" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Sellers
            </TabsTrigger>
            <TabsTrigger value="volume" className="gap-2">
              <Crown className="w-4 h-4" />
              Volume
            </TabsTrigger>
            <TabsTrigger value="rarity" className="gap-2">
              <Star className="w-4 h-4" />
              Rarity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collectors" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Top Collectors</CardTitle>
              </CardHeader>
              <CardContent>
                {topCollectors.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No collectors yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topCollectors.map((entry, index) => renderLeaderboardEntry(entry, index))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sellers" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Top Sellers</CardTitle>
              </CardHeader>
              <CardContent>
                {topSellers.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No sellers yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topSellers.map((entry, index) => renderLeaderboardEntry(entry, index, true))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="volume" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Top by Trading Volume</CardTitle>
              </CardHeader>
              <CardContent>
                {topByVolume.length === 0 ? (
                  <div className="text-center py-12">
                    <Crown className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No volume data yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topByVolume.map((entry, index) => renderLeaderboardEntry(entry, index, true, 'ETH'))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rarity" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Top by Rarity (Avg Score)</CardTitle>
              </CardHeader>
              <CardContent>
                {topByRarity.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No rarity data yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topByRarity.map((entry, index) => renderLeaderboardEntry(entry, index, true, 'Score'))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
