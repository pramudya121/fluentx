import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWeb3 } from '@/contexts/Web3Context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User, Edit, Save, X, Star, Package, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { listNFT } from '@/lib/web3/contracts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Profile {
  username: string;
  bio: string;
  avatar_url: string;
  twitter_url: string;
  discord_url: string;
  website_url: string;
}

interface NFT {
  id: string;
  token_id: number;
  name: string;
  description?: string;
  image_url: string;
  listings?: { active: boolean; price: string }[];
}

interface UserBadge {
  badges: {
    name: string;
    description: string;
    icon: string;
  };
}

export default function Profile() {
  const { account } = useWeb3();
  const [profile, setProfile] = useState<Profile>({
    username: '',
    bio: '',
    avatar_url: '',
    twitter_url: '',
    discord_url: '',
    website_url: ''
  });
  const [ownedNFTs, setOwnedNFTs] = useState<NFT[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listingNFT, setListingNFT] = useState<NFT | null>(null);
  const [listPrice, setListPrice] = useState('');
  const [listing, setListing] = useState(false);

  useEffect(() => {
    if (account) {
      fetchProfile();
      fetchOwnedNFTs();
      fetchBadges();
    }
  }, [account]);

  async function fetchProfile() {
    if (!account) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', account.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile({
          username: data.username || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          twitter_url: data.twitter_url || '',
          discord_url: data.discord_url || '',
          website_url: data.website_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOwnedNFTs() {
    if (!account) return;

    try {
      const { data, error } = await supabase
        .from('nfts')
        .select(`
          *,
          listings(active, price)
        `)
        .eq('owner_address', account.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOwnedNFTs(data || []);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    }
  }

  async function fetchBadges() {
    if (!account) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('wallet_address', account.toLowerCase())
        .single();

      if (profileData) {
        const { data, error } = await supabase
          .from('user_badges')
          .select(`
            badges(name, description, icon)
          `)
          .eq('profile_id', profileData.id);

        if (error) throw error;
        setBadges(data || []);
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  }

  async function saveProfile() {
    if (!account) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          wallet_address: account.toLowerCase(),
          ...profile,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        });

      if (error) throw error;
      
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  function handleListNFT(nft: NFT) {
    setListingNFT(nft);
    setListPrice('');
  }

  async function confirmList() {
    if (!listingNFT || !listPrice) {
      toast.error('Please enter a valid price');
      return;
    }

    const price = parseFloat(listPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setListing(true);
    try {
      await listNFT(listingNFT.token_id, listPrice);
      toast.success(`Successfully listed ${listingNFT.name} for ${listPrice} ETH!`);
      setListingNFT(null);
      setListPrice('');
      fetchOwnedNFTs(); // Refresh the list
    } catch (error: any) {
      console.error('Error listing NFT:', error);
      toast.error(error.message || 'Failed to list NFT');
    } finally {
      setListing(false);
    }
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-2xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground">
              Please connect your wallet to view your profile
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Profile Header */}
        <Card className="glass-card mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-4xl overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-white" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Username</Label>
                      <Input
                        value={profile.username}
                        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                        placeholder="Your username"
                      />
                    </div>
                    <div>
                      <Label>Bio</Label>
                      <Textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us about yourself"
                        rows={3}
                      />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Twitter URL</Label>
                        <Input
                          value={profile.twitter_url}
                          onChange={(e) => setProfile({ ...profile, twitter_url: e.target.value })}
                          placeholder="https://twitter.com/..."
                        />
                      </div>
                      <div>
                        <Label>Discord URL</Label>
                        <Input
                          value={profile.discord_url}
                          onChange={(e) => setProfile({ ...profile, discord_url: e.target.value })}
                          placeholder="discord.gg/..."
                        />
                      </div>
                      <div>
                        <Label>Website URL</Label>
                        <Input
                          value={profile.website_url}
                          onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveProfile} disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h1 className="text-3xl font-bold mb-2">
                          {profile.username || 'Unnamed User'}
                        </h1>
                        <p className="text-muted-foreground font-mono text-sm">
                          {formatAddress(account)}
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                    
                    {profile.bio && (
                      <p className="text-foreground/80 mb-4">{profile.bio}</p>
                    )}

                    {/* Badges */}
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {badges.map((userBadge, index) => (
                          <Badge key={index} variant="outline" className="text-sm">
                            <span className="mr-1">{userBadge.badges.icon}</span>
                            {userBadge.badges.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Social Links */}
                    <div className="flex flex-wrap gap-4">
                      {profile.twitter_url && (
                        <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          Twitter →
                        </a>
                      )}
                      {profile.discord_url && (
                        <a href={profile.discord_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          Discord →
                        </a>
                      )}
                      {profile.website_url && (
                        <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          Website →
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NFTs Tabs */}
        <Tabs defaultValue="owned">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="owned">
              <Package className="w-4 h-4 mr-2" />
              Owned ({ownedNFTs.length})
            </TabsTrigger>
            <TabsTrigger value="listed">
              <Tag className="w-4 h-4 mr-2" />
              Listed ({ownedNFTs.filter(nft => nft.listings?.some(l => l.active)).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="owned">
            {ownedNFTs.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-20 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-2xl font-semibold mb-2">No NFTs yet</h3>
                  <p className="text-muted-foreground mb-6">Mint or buy your first NFT to get started</p>
                  <Link to="/mint">
                    <Button className="bg-gradient-to-r from-primary to-primary-glow">
                      Mint NFT
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {ownedNFTs.map((nft) => (
                  <Card key={nft.id} className="group hover-glow overflow-hidden">
                    <Link to={`/nft/${nft.id}`}>
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={nft.image_url}
                          alt={nft.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    </Link>
                    <CardContent className="pt-4">
                      <Link to={`/nft/${nft.id}`}>
                        <h3 className="font-bold text-lg mb-2 truncate hover:text-primary">{nft.name}</h3>
                      </Link>
                      <div className="flex items-center justify-between gap-2">
                        {nft.listings?.some(l => l.active) ? (
                          <Badge variant="outline" className="text-primary">
                            {nft.listings.find(l => l.active)?.price} ETH
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleListNFT(nft)}
                            className="w-full bg-gradient-to-r from-primary to-primary-glow"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            List for Sale
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="listed">
            {ownedNFTs.filter(nft => nft.listings?.some(l => l.active)).length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-20 text-center">
                  <Tag className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-2xl font-semibold mb-2">No listed NFTs</h3>
                  <p className="text-muted-foreground">List your NFTs to start selling</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {ownedNFTs
                  .filter(nft => nft.listings?.some(l => l.active))
                  .map((nft) => (
                    <Link key={nft.id} to={`/nft/${nft.id}`}>
                      <Card className="group hover-glow overflow-hidden">
                        <div className="aspect-square overflow-hidden">
                          <img
                            src={nft.image_url}
                            alt={nft.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <CardContent className="pt-4">
                          <h3 className="font-bold text-lg mb-2 truncate">{nft.name}</h3>
                          <Badge variant="outline" className="text-primary">
                            {nft.listings?.find(l => l.active)?.price} ETH
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* List NFT Dialog */}
      <Dialog open={!!listingNFT} onOpenChange={() => !listing && setListingNFT(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>List NFT for Sale</DialogTitle>
            <DialogDescription>
              Set a price for your NFT to list it on the marketplace.
            </DialogDescription>
          </DialogHeader>
          
          {listingNFT && (
            <div className="space-y-4">
              <div className="aspect-square w-full overflow-hidden rounded-lg">
                <img 
                  src={listingNFT.image_url} 
                  alt={listingNFT.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">{listingNFT.name}</h3>
                <p className="text-sm text-muted-foreground">{listingNFT.description}</p>
              </div>
              <div>
                <Label htmlFor="list-price">List Price (ETH)</Label>
                <Input
                  id="list-price"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.1"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  disabled={listing}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setListingNFT(null)}
              disabled={listing}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmList}
              disabled={listing || !listPrice}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              {listing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Listing...
                </>
              ) : (
                'Confirm Listing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
