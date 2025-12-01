import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign, Package, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SUPPORTED_NETWORKS } from '@/lib/web3/config';
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalNFTs: number;
  totalSales: number;
  totalVolume: number;
  activeListings: number;
}

interface ChartData {
  name: string;
  value: number;
}

interface ChainStats {
  chainId: number;
  chainName: string;
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
  const [chainStats, setChainStats] = useState<ChainStats[]>([]);
  const [salesData, setSalesData] = useState<ChartData[]>([]);
  const [volumeData, setVolumeData] = useState<ChartData[]>([]);
  const [distributionData, setDistributionData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--primary-glow))', '#4ade80', '#fbbf24', '#f87171'];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      // Total NFTs
      const { count: nftCount } = await supabase
        .from('nfts')
        .select('*', { count: 'exact', head: true });

      // Total Sales and Volume
      const { data: salesData, count: salesCount } = await supabase
        .from('transactions')
        .select('price, created_at', { count: 'exact' })
        .eq('type', 'sale')
        .order('created_at', { ascending: true });

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

      // Fetch per-chain statistics
      await fetchChainStats();

      // Prepare chart data
      prepareSalesData(salesData || []);
      prepareDistributionData(nftCount || 0, listingsCount || 0, salesCount || 0);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchChainStats() {
    try {
      const chainStatsData: ChainStats[] = [];

      for (const [chainIdStr, network] of Object.entries(SUPPORTED_NETWORKS)) {
        const chainId = parseInt(chainIdStr);

        // Fetch NFT count per chain
        const { count: nftCount } = await supabase
          .from('nfts')
          .select('*', { count: 'exact', head: true })
          .eq('chain_id', chainId);

        // Fetch sales per chain
        const { data: sales } = await supabase
          .from('transactions')
          .select('*')
          .eq('type', 'sale')
          .eq('chain_id', chainId);

        // Fetch active listings per chain
        const { count: listingCount } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('active', true)
          .eq('chain_id', chainId);

        const totalVolume = sales?.reduce((sum, sale) => sum + parseFloat(sale.price || '0'), 0) || 0;

        chainStatsData.push({
          chainId,
          chainName: network.name,
          totalNFTs: nftCount || 0,
          totalSales: sales?.length || 0,
          totalVolume,
          activeListings: listingCount || 0
        });
      }

      setChainStats(chainStatsData);
    } catch (error) {
      console.error('Error fetching chain stats:', error);
    }
  }

  function prepareSalesData(sales: any[]) {
    // Group sales by day for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const salesByDay = last7Days.map(day => {
      const daySales = sales.filter(s => s.created_at.startsWith(day));
      const volume = daySales.reduce((sum, s) => sum + parseFloat(s.price || '0'), 0);
      return {
        name: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: daySales.length,
        volume: parseFloat(volume.toFixed(2))
      };
    });

    setSalesData(salesByDay.map(d => ({ name: d.name, value: d.sales })));
    setVolumeData(salesByDay.map(d => ({ name: d.name, value: d.volume })));
  }

  function prepareDistributionData(total: number, listed: number, sold: number) {
    const unlisted = total - listed - sold;
    setDistributionData([
      { name: 'Listed', value: listed },
      { name: 'Sold', value: sold },
      { name: 'Unlisted', value: Math.max(0, unlisted) },
    ]);
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
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive marketplace insights and statistics
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Trend */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Daily Sales Trend</CardTitle>
              <CardDescription>Number of sales over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--foreground))" 
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))" 
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Volume Trend */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Trading Volume</CardTitle>
              <CardDescription>ETH volume over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--foreground))" 
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))" 
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Distribution and Insights */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* NFT Distribution */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>NFT Distribution</CardTitle>
              <CardDescription>Breakdown of NFT status</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Key Performance Metrics</CardTitle>
              <CardDescription>Important marketplace indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Average Sale Price</span>
                  <span className="text-2xl font-bold text-primary">
                    {stats.totalSales > 0 ? (stats.totalVolume / stats.totalSales).toFixed(3) : '0.000'} ETH
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Listing Rate</span>
                  <span className="text-2xl font-bold">
                    {stats.totalNFTs > 0 ? ((stats.activeListings / stats.totalNFTs) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Sales Conversion</span>
                  <span className="text-2xl font-bold">
                    {stats.totalNFTs > 0 ? ((stats.totalSales / stats.totalNFTs) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-Chain Statistics */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Per-Chain Statistics
            </CardTitle>
            <CardDescription>Network-specific marketplace metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {chainStats.map((chain) => (
                <div key={chain.chainId} className="border border-border/50 rounded-lg p-6 hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">{chain.chainName}</h3>
                    <Badge variant="outline" className="text-xs">
                      Chain {chain.chainId}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total NFTs</p>
                      <p className="text-2xl font-bold">{chain.totalNFTs}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold">{chain.totalSales}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Volume</p>
                      <p className="text-2xl font-bold text-primary">{chain.totalVolume.toFixed(3)} ETH</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Active Listings</p>
                      <p className="text-2xl font-bold">{chain.activeListings}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}