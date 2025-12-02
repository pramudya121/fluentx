import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWeb3 } from '@/contexts/Web3Context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { buyNFT, listNFT, makeOffer, acceptOffer, cancelOffer } from '@/lib/web3/contracts';
import { ShoppingCart, Tag, DollarSign, X, Check, Loader2, ExternalLink } from 'lucide-react';
import { formatDistance } from 'date-fns';
import WatchlistButton from '@/components/WatchlistButton';

interface NFT {
  id: string;
  token_id: number;
  name: string;
  description: string;
  image_url: string;
  owner_address: string;
  creator_address: string;
  listings?: { listing_id: number; price: string; active: boolean }[];
}

interface Transaction {
  id: string;
  type: string;
  from_address: string;
  to_address: string;
  price: string | null;
  created_at: string;
  tx_hash: string | null;
}

interface Offer {
  id: string;
  offerer_address: string;
  price: string;
  status: string;
  created_at: string;
}

export default function NFTDetail() {
  const { id } = useParams<{ id: string }>();
  const { account } = useWeb3();
  const navigate = useNavigate();
  const [nft, setNFT] = useState<NFT | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [listPrice, setListPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [listing, setListing] = useState(false);
  const [offering, setOffering] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchNFTDetails();
      fetchTransactions();
      fetchOffers();
    }
  }, [id]);

  async function fetchNFTDetails() {
    try {
      const { data, error } = await supabase
        .from('nfts')
        .select(`
          *,
          listings(listing_id, price, active)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setNFT(data);
    } catch (error) {
      console.error('Error fetching NFT:', error);
      toast.error('Failed to load NFT details');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('nft_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }

  async function fetchOffers() {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('nft_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  }

  async function handleBuy() {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!nft || !nft.listings?.length) {
      toast.error('This NFT is not available for purchase');
      return;
    }

    const activeListing = nft.listings.find(l => l.active);
    if (!activeListing) {
      toast.error('This NFT is no longer listed');
      return;
    }

    setBuying(true);
    try {
      toast.info(`Processing purchase of ${nft.name} for ${activeListing.price} ETH...`);
      await buyNFT(activeListing.listing_id, activeListing.price);
      toast.success(`Successfully purchased ${nft.name}! Redirecting to your profile...`);
      setTimeout(() => navigate('/profile'), 2000);
    } catch (error: any) {
      console.error('Error buying NFT:', error);
      toast.error(error.message || 'Failed to purchase NFT');
    } finally {
      setBuying(false);
    }
  }

  async function handleList() {
    if (!nft || !account || !listPrice) {
      toast.error('Please enter a price');
      return;
    }

    const price = parseFloat(listPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price greater than 0');
      return;
    }

    if (price < 0.0001) {
      toast.error('Minimum listing price is 0.0001 ETH');
      return;
    }

    setListing(true);
    try {
      toast.info('Approving marketplace contract...');
      await listNFT(nft.token_id, listPrice);
      toast.success(`NFT listed successfully for ${listPrice} ETH!`);
      setListPrice('');
      fetchNFTDetails();
    } catch (error: any) {
      console.error('Error listing NFT:', error);
      toast.error(error.message || 'Failed to list NFT');
    } finally {
      setListing(false);
    }
  }

  async function handleMakeOffer() {
    if (!nft || !account || !offerPrice) {
      toast.error('Please enter an offer price');
      return;
    }

    const price = parseFloat(offerPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price greater than 0');
      return;
    }

    if (price < 0.0001) {
      toast.error('Minimum offer price is 0.0001 ETH');
      return;
    }

    if (hasActiveListing && price >= parseFloat(activeListing.price)) {
      toast.error(`Your offer should be less than the listing price (${activeListing.price} ETH). Consider buying directly instead.`);
      return;
    }

    setOffering(true);
    try {
      toast.info('Submitting offer...');
      await makeOffer(nft.token_id, offerPrice);
      toast.success(`Offer of ${offerPrice} ETH submitted successfully!`);
      setOfferPrice('');
      fetchOffers();
    } catch (error: any) {
      console.error('Error making offer:', error);
      toast.error(error.message || 'Failed to make offer');
    } finally {
      setOffering(false);
    }
  }

  async function handleAcceptOffer(offerAddress: string, offerPrice: string) {
    if (!nft || !account) {
      toast.error('Unable to accept offer');
      return;
    }

    if (!window.confirm(`Are you sure you want to accept this offer of ${offerPrice} ETH from ${formatAddress(offerAddress)}?`)) {
      return;
    }

    setAccepting(offerAddress);
    try {
      toast.info('Accepting offer...');
      await acceptOffer(nft.token_id, offerAddress);
      toast.success(`Offer of ${offerPrice} ETH accepted! Redirecting...`);
      setTimeout(() => navigate('/profile'), 2000);
    } catch (error: any) {
      console.error('Error accepting offer:', error);
      toast.error(error.message || 'Failed to accept offer');
    } finally {
      setAccepting(null);
    }
  }

  async function handleCancelOffer() {
    if (!nft || !account) {
      toast.error('Unable to cancel offer');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel your offer? This action cannot be undone.')) {
      return;
    }

    setCancelling(true);
    try {
      toast.info('Cancelling offer...');
      await cancelOffer(nft.token_id);
      toast.success('Offer cancelled successfully!');
      fetchOffers();
    } catch (error: any) {
      console.error('Error cancelling offer:', error);
      toast.error(error.message || 'Failed to cancel offer');
    } finally {
      setCancelling(false);
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isOwner = account?.toLowerCase() === nft?.owner_address.toLowerCase();
  const activeListing = nft?.listings?.find(l => l.active);
  const hasActiveListing = !!activeListing;
  const userOffer = offers.find(o => o.offerer_address.toLowerCase() === account?.toLowerCase());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading NFT...</p>
        </div>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md mx-4">
          <CardContent className="py-12 text-center">
            <h3 className="text-2xl font-semibold mb-2">NFT Not Found</h3>
            <p className="text-muted-foreground mb-6">This NFT doesn't exist or has been removed</p>
            <Button onClick={() => navigate('/marketplace')}>
              Go to Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* NFT Image */}
          <div className="space-y-4">
            <Card className="glass-card overflow-hidden">
              <div className="aspect-square">
                <img
                  src={nft.image_url}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </Card>
          </div>

          {/* NFT Details */}
          <div className="space-y-6">
            {/* Title & Price */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-2">{nft.name}</CardTitle>
                    <CardDescription>Token ID: #{nft.token_id}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <WatchlistButton nftId={nft.id} />
                    {hasActiveListing && (
                      <Badge className="text-lg px-4 py-2 bg-gradient-to-r from-primary to-primary-glow">
                        {activeListing.price} ETH
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 mb-4">{nft.description || 'No description'}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Owner</p>
                    <p className="font-mono font-semibold">{formatAddress(nft.owner_address)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Creator</p>
                    <p className="font-mono font-semibold">{formatAddress(nft.creator_address)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {isOwner ? (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Owner Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!hasActiveListing ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">List for Sale</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.001"
                          min="0.0001"
                          placeholder="Price in ETH"
                          value={listPrice}
                          onChange={(e) => setListPrice(e.target.value)}
                        />
                        <Button
                          onClick={handleList}
                          disabled={!listPrice || listing}
                          className="bg-gradient-to-r from-primary to-primary-glow whitespace-nowrap"
                        >
                          {listing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4 mr-2" />}
                          {listing ? 'Listing...' : 'List'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm text-primary font-medium">Currently listed for {activeListing.price} ETH</p>
                    </div>
                  )}

                  {/* Accept Offers */}
                  {offers.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pending Offers ({offers.length})</label>
                      {offers.map((offer) => (
                        <div key={offer.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="font-semibold">{offer.price} ETH</p>
                            <p className="text-xs text-muted-foreground">
                              {formatAddress(offer.offerer_address)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptOffer(offer.offerer_address, offer.price)}
                            disabled={accepting === offer.offerer_address}
                            className="bg-gradient-to-r from-primary to-primary-glow"
                          >
                            {accepting === offer.offerer_address ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Purchase</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasActiveListing ? (
                    <Button
                      onClick={handleBuy}
                      disabled={buying || !account}
                      className="w-full h-12 text-lg bg-gradient-to-r from-primary to-primary-glow"
                    >
                      {buying ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          Buy for {activeListing.price} ETH
                        </>
                      )}
                    </Button>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">Not currently listed for sale</p>
                  )}

                  <Separator />

                  {/* Make Offer */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Make an Offer</label>
                    {userOffer ? (
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-sm font-medium">Your offer: {userOffer.price} ETH</p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleCancelOffer}
                          disabled={cancelling}
                          className="w-full"
                        >
                          {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                          Cancel Offer
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.001"
                          min="0.0001"
                          placeholder="Offer price in ETH"
                          value={offerPrice}
                          onChange={(e) => setOfferPrice(e.target.value)}
                        />
                        <Button
                          onClick={handleMakeOffer}
                          disabled={!offerPrice || offering || !account}
                          className="bg-gradient-to-r from-primary to-primary-glow whitespace-nowrap"
                        >
                          {offering ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                          {offering ? 'Submitting...' : 'Offer'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-3 rounded-lg bg-muted/30 text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{tx.type.toUpperCase()}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistance(new Date(tx.created_at), new Date(), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <p>From: {formatAddress(tx.from_address)}</p>
                          <p>To: {formatAddress(tx.to_address)}</p>
                          {tx.price && <p className="text-primary font-semibold">Price: {tx.price} ETH</p>}
                          {tx.tx_hash && (
                            <a
                              href={`https://testnet.fluentscan.xyz/tx/${tx.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              View on Explorer <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
