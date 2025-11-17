import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign, Package } from 'lucide-react';

interface Stats {
  totalNFTs: number;
  totalSales: number;
  totalVolume: number;
  activeListings: number;
}

export default function Analytics() {
  const [stats, setStats] = useState<Stats>({
    totalNFTs: 0,
    totalSales: 0,
    totalVolume: 0,
    activeListings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      // Total NFTs
      const { count: nftCount } = await supabase
        .from('nfts')
        .select('*', { count: 'exact', head: true });

      // Total Sales
      const { data: salesData, count: salesCount } = await supabase
        .from('transactions')
        .select('price', { count: 'exact' })
        .eq('type', 'sale');

      // Calculate total volume
      const totalVolume = salesData?.reduce((sum, tx) => sum + parseFloat(tx.price || '0'), 0) || 0;

      // Active listings
      const { count: listingsCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      setStats({
        totalNFTs: nftCount || 0,
        totalSales: salesCount || 0,
        totalVolume,
        activeListings: listingsCount || 0
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total NFTs',
      value: stats.totalNFTs.toLocaleString(),
      description: 'Minted on platform',
      icon: Package,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Total Sales',
      value: stats.totalSales.toLocaleString(),
      description: 'Completed transactions',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Total Volume',
      value: `${stats.totalVolume.toFixed(2)} ETH`,
      description: 'All-time trading volume',
      icon: DollarSign,
      color: 'from-primary to-primary-glow'
    },
    {
      title: 'Active Listings',
      value: stats.activeListings.toLocaleString(),
      description: 'Currently listed',
      icon: BarChart3,
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-muted-foreground text-lg">
            Marketplace statistics and insights
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="glass-card hover-glow overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-sm">{stat.title}</CardDescription>
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Analytics Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Marketplace Insights</CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">Average Sale Price</span>
                <span className="font-semibold">
                  {stats.totalSales > 0 
                    ? `${(stats.totalVolume / stats.totalSales).toFixed(3)} ETH`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">Listing Rate</span>
                <span className="font-semibold">
                  {stats.totalNFTs > 0 
                    ? `${((stats.activeListings / stats.totalNFTs) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">Sales Conversion</span>
                <span className="font-semibold">
                  {stats.activeListings > 0 
                    ? `${((stats.totalSales / (stats.activeListings + stats.totalSales)) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Growth Metrics</CardTitle>
              <CardDescription>Platform activity overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">NFTs Listed</span>
                  <span className="font-semibold">{stats.activeListings}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.activeListings / stats.totalNFTs) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sales Completed</span>
                  <span className="font-semibold">{stats.totalSales}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.totalSales / stats.totalNFTs) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trading Volume</span>
                  <span className="font-semibold">{stats.totalVolume.toFixed(2)} ETH</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.totalVolume / Math.max(stats.totalVolume, 10)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
