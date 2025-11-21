import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Search, Filter, Eye, ShoppingCart, Loader2, SlidersHorizontal, X, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useWeb3 } from '@/contexts/Web3Context';
import { buyNFT } from '@/lib/web3/contracts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NFT {
  id: string;
  token_id: number;
  name: string;
  description: string;
  image_url: string;
  owner_address: string;
  created_at?: string;
  rarity_score?: number;
  listings?: { price: string; active: boolean; listing_id: number }[];
}

export default function Marketplace() {
  const { account } = useWeb3();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<NFT[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [priceRange, setPriceRange] = useState([0, 10]);
  const [rarityFilter, setRarityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buyingNFT, setBuyingNFT] = useState<NFT | null>(null);
  const [buying, setBuying] = useState(false);

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
  }, [nfts, searchTerm, sortBy, priceRange, rarityFilter]);

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

    // Price range filter
    filtered = filtered.filter(nft => {
      const price = parseFloat(nft.listings?.[0]?.price || '0');
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Rarity filter
    if (rarityFilter !== 'all') {
      filtered = filtered.filter(nft => {
        const rarity = nft.rarity_score || 0;
        switch (rarityFilter) {
          case 'common': return rarity < 30;
          case 'rare': return rarity >= 30 && rarity < 60;
          case 'epic': return rarity >= 60 && rarity < 85;
          case 'legendary': return rarity >= 85;
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
        case 'rarity':
          return (b.rarity_score || 0) - (a.rarity_score || 0);
        case 'recent':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    setFilteredNfts(filtered);
  }

  async function handleBuy(nft: NFT) {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    const activeListing = nft.listings?.find(l => l.active);
    if (!activeListing) {
      toast.error('This NFT is not listed for sale');
      return;
    }

    setBuyingNFT(nft);
  }

  async function confirmBuy() {
    if (!buyingNFT || !buyingNFT.listings?.length) {
      toast.error('Unable to process purchase');
      return;
    }

    const activeListing = buyingNFT.listings.find(l => l.active);
    if (!activeListing) {
      toast.error('This NFT is no longer available');
      return;
    }

    setBuying(true);
    try {
      toast.info(`Processing purchase of ${buyingNFT.name}...`);
      await buyNFT(activeListing.listing_id, activeListing.price);
      toast.success(`Successfully purchased ${buyingNFT.name}!`);
      setBuyingNFT(null);
      fetchNFTs(); // Refresh the list
    } catch (error: any) {
      console.error('Error buying NFT:', error);
      toast.error(error.message || 'Failed to buy NFT');
    } finally {
      setBuying(false);
    }
  }

  function clearFilters() {
    setSearchTerm('');
    setPriceRange([0, 10]);
    setRarityFilter('all');
    setSortBy('recent');
  }

  function getRarityColor(score?: number) {
    if (!score) return 'text-muted-foreground';
    if (score >= 85) return 'text-yellow-500';
    if (score >= 60) return 'text-purple-500';
    if (score >= 30) return 'text-blue-500';
    return 'text-muted-foreground';
  }

  function getRarityLabel(score?: number) {
    if (!score) return 'Common';
    if (score >= 85) return 'Legendary';
    if (score >= 60) return 'Epic';
    if (score >= 30) return 'Rare';
    return 'Common';
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

        {/* Filters Bar */}
        <Card className="mb-6 glass-card">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search and Quick Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search NFTs by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Most Recent
                      </div>
                    </SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rarity">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        By Rarity
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Advanced Filters Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full md:w-auto"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {(rarityFilter !== 'all' || priceRange[0] > 0 || priceRange[1] < 10) && (
                    <Badge variant="secondary" className="ml-2">Active</Badge>
                  )}
                </Button>
              </div>

              {/* Advanced Filters */}
              <Collapsible open={showFilters}>
                <CollapsibleContent className="space-y-4 pt-4 border-t">
                  {/* Price Range */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Price Range (ETH)</Label>
                      <span className="text-sm text-muted-foreground">
                        {priceRange[0]} - {priceRange[1]} ETH
                      </span>
                    </div>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={10}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Rarity Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Rarity</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={rarityFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRarityFilter('all')}
                      >
                        All
                      </Button>
                      <Button
                        variant={rarityFilter === 'common' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRarityFilter('common')}
                      >
                        Common
                      </Button>
                      <Button
                        variant={rarityFilter === 'rare' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRarityFilter('rare')}
                        className="text-blue-500"
                      >
                        Rare
                      </Button>
                      <Button
                        variant={rarityFilter === 'epic' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRarityFilter('epic')}
                        className="text-purple-500"
                      >
                        Epic
                      </Button>
                      <Button
                        variant={rarityFilter === 'legendary' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRarityFilter('legendary')}
                        className="text-yellow-500"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Legendary
                      </Button>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredNfts.length} of {nfts.length} NFTs
        </div>

        {/* NFT Grid */}
        {filteredNfts.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-2xl font-semibold mb-2">No NFTs found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters</p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredNfts.map((nft) => (
              <Card key={nft.id} className="group hover-glow overflow-hidden">
                <div className="aspect-square overflow-hidden relative">
                  <img
                    src={nft.image_url}
                    alt={nft.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {nft.rarity_score && (
                    <Badge 
                      className={`absolute top-2 right-2 ${getRarityColor(nft.rarity_score)}`}
                      variant="secondary"
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {getRarityLabel(nft.rarity_score)}
                    </Badge>
                  )}
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
                  <Button 
                    onClick={() => handleBuy(nft)}
                    disabled={!account || nft.owner_address.toLowerCase() === account?.toLowerCase()}
                    className="flex-1 bg-gradient-to-r from-primary to-primary-glow"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {nft.owner_address.toLowerCase() === account?.toLowerCase() ? 'Owned' : 'Buy'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Buy Confirmation Dialog */}
      <Dialog open={!!buyingNFT} onOpenChange={() => !buying && setBuyingNFT(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Review the details before completing your purchase.
            </DialogDescription>
          </DialogHeader>
          
          {buyingNFT && (
            <div className="space-y-4">
              <div className="aspect-square w-full overflow-hidden rounded-lg">
                <img 
                  src={buyingNFT.image_url} 
                  alt={buyingNFT.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">{buyingNFT.name}</h3>
                <p className="text-sm text-muted-foreground">{buyingNFT.description}</p>
                {buyingNFT.rarity_score && (
                  <Badge className={`mt-2 ${getRarityColor(buyingNFT.rarity_score)}`}>
                    <Star className="w-3 h-3 mr-1" />
                    {getRarityLabel(buyingNFT.rarity_score)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Total Price</span>
                <span className="text-xl font-bold text-primary">
                  {buyingNFT.listings?.[0]?.price} ETH
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setBuyingNFT(null)}
              disabled={buying}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmBuy}
              disabled={buying}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              {buying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Purchase'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}