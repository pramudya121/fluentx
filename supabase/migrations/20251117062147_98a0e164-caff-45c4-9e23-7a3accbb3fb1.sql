-- Create storage buckets for NFT images and metadata
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('nft-images', 'nft-images', true),
  ('nft-metadata', 'nft-metadata', true);

-- Create storage policies for public access
CREATE POLICY "NFT images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'nft-images');

CREATE POLICY "Anyone can upload NFT images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'nft-images');

CREATE POLICY "NFT metadata is publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'nft-metadata');

CREATE POLICY "Anyone can upload NFT metadata" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'nft-metadata');