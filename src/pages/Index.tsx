import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';
import heroBackground from '@/assets/hero-background.jpg';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeaturedNFT {
  id: string;
  name: string;
  image_url: string;
  listings?: { price: string; active: boolean }[];
}

export default function Index() {
  const [featuredNFTs, setFeaturedNFTs] = useState<FeaturedNFT[]>([]);

  useEffect(() => {
    fetchFeaturedNFTs();
  }, []);

  async function fetchFeaturedNFTs() {
    try {
      const { data } = await supabase
        .from('nfts')
        .select(`
          id,
          name,
          image_url,
          listings(price, active)
        `)
        .order('created_at', { ascending: false })
        .limit(4);
      
      setFeaturedNFTs(data || []);
    } catch (error) {
      console.error('Error fetching featured NFTs:', error);
    }
  }

  const features = [
    {
      icon: Sparkles,
      title: 'Easy Minting',
      description: 'Create NFTs from your device in minutes with our simple upload process'
    },
    {
      icon: TrendingUp,
      title: 'Fixed Price & Offers',
      description: 'List at fixed prices or negotiate with the offer system'
    },
    {
      icon: Shield,
      title: 'Secure Trading',
      description: 'All transactions secured by smart contracts on FLUENT Testnet'
    },
    {
      icon: Zap,
      title: 'Real-time Updates',
      description: 'Live activity feed and instant notifications for all marketplace events'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative min-h-[600px] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
        
        <div className="container mx-auto px-4 relative z-10 text-center animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white drop-shadow-lg">
            Sakura NFT Marketplace
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 drop-shadow-lg max-w-2xl mx-auto">
            Discover, collect, and trade unique NFTs on FLUENT Testnet with the beauty of winter sakura
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/marketplace">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-lg h-14 px-8">
                Explore Marketplace
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/mint">
              <Button size="lg" variant="outline" className="text-lg h-14 px-8 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
                <Sparkles className="mr-2 w-5 h-5" />
                Mint NFT
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-20">
        {/* Features */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Why Choose Sakura?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The most elegant and feature-rich NFT marketplace on FLUENT Testnet
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="glass-card hover-glow">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Featured NFTs */}
        {featuredNFTs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  Featured NFTs
                </h2>
                <p className="text-muted-foreground">Discover the latest additions to our marketplace</p>
              </div>
              <Link to="/marketplace">
                <Button variant="outline" className="hidden sm:flex">
                  View All
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredNFTs.map((nft) => (
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
                      {nft.listings?.some(l => l.active) && (
                        <p className="text-primary font-semibold">
                          {nft.listings.find(l => l.active)?.price} ETH
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="mt-20 text-center">
          <Card className="glass-card p-12 bg-gradient-to-br from-primary/5 to-primary-glow/5 border-primary/20">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Start Your NFT Journey Today
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Join our growing community of collectors and creators on FLUENT Testnet
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/mint">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
                    <Sparkles className="mr-2 w-5 h-5" />
                    Create Your First NFT
                  </Button>
                </Link>
                <Link to="/leaderboard">
                  <Button size="lg" variant="outline">
                    View Leaderboard
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
