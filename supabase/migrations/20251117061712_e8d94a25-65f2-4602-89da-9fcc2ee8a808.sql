-- Create nfts table to store NFT metadata
CREATE TABLE public.nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  creator_address TEXT NOT NULL,
  metadata_uri TEXT,
  rarity_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contract_address, token_id)
);

-- Create listings table for marketplace
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id INTEGER NOT NULL UNIQUE,
  nft_id UUID REFERENCES public.nfts(id) ON DELETE CASCADE,
  seller_address TEXT NOT NULL,
  price TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create offers table
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id UUID REFERENCES public.nfts(id) ON DELETE CASCADE,
  offerer_address TEXT NOT NULL,
  price TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create transactions table for history
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id UUID REFERENCES public.nfts(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  price TEXT,
  type TEXT NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  username TEXT,
  bio TEXT,
  avatar_url TEXT,
  twitter_url TEXT,
  discord_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create badges table for achievements
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  criteria TEXT NOT NULL
);

-- Create user_badges junction table
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, badge_id)
);

-- Create watchlist table
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nft_id UUID REFERENCES public.nfts(id) ON DELETE CASCADE,
  price_alert TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, nft_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  related_nft_id UUID REFERENCES public.nfts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read access for marketplace data
CREATE POLICY "NFTs are viewable by everyone" ON public.nfts FOR SELECT USING (true);
CREATE POLICY "NFTs can be inserted by anyone" ON public.nfts FOR INSERT WITH CHECK (true);
CREATE POLICY "NFTs can be updated by anyone" ON public.nfts FOR UPDATE USING (true);

CREATE POLICY "Listings are viewable by everyone" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Listings can be inserted by anyone" ON public.listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Listings can be updated by anyone" ON public.listings FOR UPDATE USING (true);

CREATE POLICY "Offers are viewable by everyone" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Offers can be inserted by anyone" ON public.offers FOR INSERT WITH CHECK (true);
CREATE POLICY "Offers can be updated by anyone" ON public.offers FOR UPDATE USING (true);
CREATE POLICY "Offers can be deleted by anyone" ON public.offers FOR DELETE USING (true);

CREATE POLICY "Transactions are viewable by everyone" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Transactions can be inserted by anyone" ON public.transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles can be inserted by anyone" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Profiles can be updated by anyone" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);
CREATE POLICY "User badges are viewable by everyone" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "User badges can be inserted by anyone" ON public.user_badges FOR INSERT WITH CHECK (true);

CREATE POLICY "Watchlist items are viewable by everyone" ON public.watchlist FOR SELECT USING (true);
CREATE POLICY "Watchlist items can be inserted by anyone" ON public.watchlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Watchlist items can be deleted by anyone" ON public.watchlist FOR DELETE USING (true);

CREATE POLICY "Notifications are viewable by everyone" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Notifications can be inserted by anyone" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Notifications can be updated by anyone" ON public.notifications FOR UPDATE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_nfts_owner ON public.nfts(owner_address);
CREATE INDEX idx_nfts_creator ON public.nfts(creator_address);
CREATE INDEX idx_listings_active ON public.listings(active);
CREATE INDEX idx_offers_status ON public.offers(status);
CREATE INDEX idx_transactions_nft ON public.transactions(nft_id);
CREATE INDEX idx_notifications_profile ON public.notifications(profile_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_nfts_updated_at BEFORE UPDATE ON public.nfts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default badges
INSERT INTO public.badges (name, description, icon, criteria) VALUES
('Early Adopter', 'One of the first users on the platform', '🌸', 'first_100_users'),
('Top Seller', 'Sold over 10 NFTs', '💎', 'sold_10_nfts'),
('Collector', 'Own 5 or more NFTs', '🎨', 'owns_5_nfts'),
('Trading Master', 'Completed 20+ transactions', '⚡', 'completed_20_transactions'),
('Diamond Hands', 'Held an NFT for over 30 days', '💪', 'held_30_days');

-- Enable realtime for activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;