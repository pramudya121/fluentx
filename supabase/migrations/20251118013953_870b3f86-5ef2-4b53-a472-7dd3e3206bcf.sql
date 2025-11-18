-- Create storage buckets for NFT images and metadata
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('nft-images', 'nft-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]),
  ('nft-metadata', 'nft-metadata', true, 1048576, ARRAY['application/json']::text[])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for nft-images bucket
CREATE POLICY "Anyone can view NFT images"
ON storage.objects FOR SELECT
USING (bucket_id = 'nft-images');

CREATE POLICY "Authenticated users can upload NFT images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nft-images');

CREATE POLICY "Users can update their own NFT images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'nft-images');

CREATE POLICY "Users can delete their own NFT images"
ON storage.objects FOR DELETE
USING (bucket_id = 'nft-images');

-- Create storage policies for nft-metadata bucket
CREATE POLICY "Anyone can view NFT metadata"
ON storage.objects FOR SELECT
USING (bucket_id = 'nft-metadata');

CREATE POLICY "Authenticated users can upload NFT metadata"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nft-metadata');

CREATE POLICY "Users can update their own NFT metadata"
ON storage.objects FOR UPDATE
USING (bucket_id = 'nft-metadata');

CREATE POLICY "Users can delete their own NFT metadata"
ON storage.objects FOR DELETE
USING (bucket_id = 'nft-metadata');