import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Eye, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useWeb3 } from '@/contexts/Web3Context';

interface NFT {
  id: string;
  token_id: number;
  name: string;
  description: string;
  image_url: string;
  owner_address: string;
  created_at?: string;
  listings?: { price: string; active: boolean; listing_id: number }[];
}

export default function Marketplace() {
  const { account } = useWeb3();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<NFT[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [priceFilter, setPriceFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNFTs();
    
    // Real-time subscription
    const channel = supabase
      .channel('marketplace-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
        fetchNFTs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterAndSortNFTs();
  }, [nfts, searchTerm, sortBy, priceFilter]);

  async function fetchNFTs() {
    try {
      const { data, error } = await supabase
        .from('nfts')
        .select(`
          *,
          listings!inner(price, active, listing_id)
        `)
        .eq('listings.active', true);

      if (error) throw error;
      setNfts(data || []);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      toast.error('Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  }

  function filterAndSortNFTs() {
    let filtered = [...nfts];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(nft =>
        nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nft.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(nft => {
        const price = parseFloat(nft.listings?.[0]?.price || '0');
        switch (priceFilter) {
          case 'low': return price < 0.1;
          case 'medium': return price >= 0.1 && price < 1;
          case 'high': return price >= 1;
          default: return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return parseFloat(a.listings?.[0]?.price || '0') - parseFloat(b.listings?.[0]?.price || '0');
        case 'price-high':
          return parseFloat(b.listings?.[0]?.price || '0') - parseFloat(a.listings?.[0]?.price || '0');
        case 'recent':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    setFilteredNfts(filtered);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            NFT Marketplace
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover and collect unique Sakura NFTs
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 glass-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search NFTs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Price Filter */}
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Price range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="low">{'< 0.1 ETH'}</SelectItem>
                  <SelectItem value="medium">0.1 - 1 ETH</SelectItem>
                  <SelectItem value="high">{'> 1 ETH'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* NFT Grid */}
        {filteredNfts.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-2xl font-semibold mb-2">No NFTs found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredNfts.map((nft) => (
              <Card key={nft.id} className="group hover-glow overflow-hidden">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={nft.image_url}
                    alt={nft.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <CardContent className="pt-4">
                  <h3 className="font-bold text-lg mb-1 truncate">{nft.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {nft.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-muted-foreground">Price</span>
                    <span className="text-lg font-bold text-primary">
                      {nft.listings?.[0]?.price} ETH
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 gap-2">
                  <Link to={`/nft/${nft.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  <Link to={`/nft/${nft.id}`} className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-primary to-primary-glow">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Buy
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
