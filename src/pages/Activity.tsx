import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity as ActivityIcon, ShoppingBag, Tag, DollarSign } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface Transaction {
  id: string;
  type: string;
  from_address: string;
  to_address: string;
  price: string | null;
  created_at: string;
  tx_hash: string | null;
  nfts: {
    name: string;
    image_url: string;
  } | null;
}

export default function Activity() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
    
    // Real-time subscription
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          nfts(name, image_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mint': return <Tag className="w-5 h-5" />;
      case 'sale': return <ShoppingBag className="w-5 h-5" />;
      case 'list': return <DollarSign className="w-5 h-5" />;
      default: return <ActivityIcon className="w-5 h-5" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      mint: 'bg-green-500/10 text-green-500 border-green-500/20',
      sale: 'bg-primary/10 text-primary border-primary/20',
      list: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    };
    
    return (
      <Badge variant="outline" className={colors[type] || ''}>
        {type.toUpperCase()}
      </Badge>
    );
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Activity Feed
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time marketplace activity
          </p>
        </div>

        {/* Activity List */}
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-20 text-center">
                <ActivityIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-2xl font-semibold mb-2">No activity yet</h3>
                <p className="text-muted-foreground">
                  Start minting and trading NFTs to see activity here
                </p>
              </CardContent>
            </Card>
          ) : (
            transactions.map((tx) => (
              <Card key={tx.id} className="glass-card hover-glow">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {/* NFT Image */}
                    {tx.nfts && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={tx.nfts.image_url}
                          alt={tx.nfts.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {getTypeIcon(tx.type)}
                          </div>
                          <div>
                            <p className="font-semibold">{tx.nfts?.name || 'Unknown NFT'}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistance(new Date(tx.created_at), new Date(), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {getTypeBadge(tx.type)}
                      </div>

                      <div className="text-sm space-y-1">
                        <p className="text-muted-foreground">
                          From: <span className="font-mono">{formatAddress(tx.from_address)}</span>
                        </p>
                        <p className="text-muted-foreground">
                          To: <span className="font-mono">{formatAddress(tx.to_address)}</span>
                        </p>
                        {tx.price && (
                          <p className="text-muted-foreground">
                            Price: <span className="font-semibold text-primary">{tx.price} ETH</span>
                          </p>
                        )}
                        {tx.tx_hash && (
                          <a
                            href={`https://testnet.fluentscan.xyz/tx/${tx.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View on Explorer →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
