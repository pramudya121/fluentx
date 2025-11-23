import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Package, Activity, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Collection {
  id: string;
  name: string;
  description: string;
  creator_address: string;
  banner_url: string;
  category: string;
  total_volume: number;
  floor_price: number;
  total_items: number;
  created_at: string;
}

interface NFT {
  id: string;
  token_id: number;
  name: string;
  image_url: string;
  rarity_score: number;
  owner_address: string;
  listings: { price: string; active: boolean }[];
}

interface Transaction {
  id: string;
  type: string;
  price: string;
  from_address: string;
  to_address: string;
  created_at: string;
  nfts: {
    name: string;
    image_url: string;
  };
}

export default function CollectionDetail() {
  const { id } = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCollectionData();
    }
  }, [id]);

  async function fetchCollectionData() {
    try {
      // Fetch collection
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', id)
        .single();

      if (collectionError) throw collectionError;
      setCollection(collectionData);

      // Fetch NFTs in collection
      const { data: nftsData, error: nftsError } = await supabase
        .from('nfts')
        .select(`
          *,
          listings!left(price, active)
        `)
        .eq('collection_id', id)
        .order('rarity_score', { ascending: false });

      if (nftsError) throw nftsError;
      setNfts(nftsData || []);

      // Fetch recent transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          nfts!inner(name, image_url, collection_id)
        `)
        .eq('nfts.collection_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txError) throw txError;
      setTransactions(txData || []);
    } catch (error) {
      console.error('Error fetching collection data:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading collection...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Collection not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container mx-auto px-4">
        {/* Banner */}
        <div className="h-64 rounded-xl overflow-hidden mb-8">
          {collection.banner_url ? (
            <img
              src={collection.banner_url}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
              <Package className="w-24 h-24 text-primary/40" />
            </div>
          )}
        </div>

        {/* Collection Info */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{collection.name}</h1>
              {collection.category && (
                <Badge variant="secondary" className="mb-2">
                  {collection.category}
                </Badge>
              )}
              {collection.description && (
                <p className="text-muted-foreground">{collection.description}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Total Volume</p>
                  <p className="text-2xl font-bold text-primary">
                    {collection.total_volume.toFixed(2)} ETH
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Floor Price</p>
                  <p className="text-2xl font-bold">
                    {collection.floor_price.toFixed(3)} ETH
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Items</p>
                  <p className="text-2xl font-bold">{collection.total_items}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Creator</p>
                  <p className="text-sm font-mono font-bold">
                    {formatAddress(collection.creator_address)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="items" className="gap-2">
              <Package className="w-4 h-4" />
              Items
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            {nfts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No items in this collection</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {nfts.map((nft) => (
                  <Link key={nft.id} to={`/nft/${nft.id}`}>
                    <Card className="glass-card hover-glow transition-all duration-300 hover:scale-105 overflow-hidden">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={nft.image_url}
                          alt={nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate">{nft.name}</h3>
                        <p className="text-xs text-muted-foreground">#{nft.token_id}</p>
                        {nft.rarity_score > 0 && (
                          <Badge variant="secondary" className="mt-2">
                            Rarity: {nft.rarity_score}
                          </Badge>
                        )}
                        {nft.listings?.[0]?.active && (
                          <p className="text-sm font-bold text-primary mt-2">
                            {nft.listings[0].price} ETH
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={tx.nfts.image_url}
                            alt={tx.nfts.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-semibold">{tx.nfts.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.type === 'sale' ? 'Sold' : 'Listed'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {tx.price && (
                            <p className="font-bold text-primary">{tx.price} ETH</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
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
