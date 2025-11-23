-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  creator_address TEXT NOT NULL,
  banner_url TEXT,
  category TEXT,
  total_volume NUMERIC DEFAULT 0,
  floor_price NUMERIC DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add collection_id to NFTs table
ALTER TABLE public.nfts ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.collections(id);

-- Create reputation/ratings table
CREATE TABLE IF NOT EXISTS public.user_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  total_sales INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  is_trusted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_address TEXT NOT NULL,
  reviewed_address TEXT NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Collections policies
CREATE POLICY "Collections are viewable by everyone"
  ON public.collections FOR SELECT
  USING (true);

CREATE POLICY "Collections can be inserted by anyone"
  ON public.collections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Collections can be updated by creator"
  ON public.collections FOR UPDATE
  USING (true);

-- Reputation policies
CREATE POLICY "Reputation is viewable by everyone"
  ON public.user_reputation FOR SELECT
  USING (true);

CREATE POLICY "Reputation can be inserted by anyone"
  ON public.user_reputation FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Reputation can be updated by anyone"
  ON public.user_reputation FOR UPDATE
  USING (true);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Reviews can be inserted by anyone"
  ON public.reviews FOR INSERT
  WITH CHECK (true);

-- Update notifications table for better notification system
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reputation_updated_at BEFORE UPDATE ON public.user_reputation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();