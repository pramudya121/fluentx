-- Add chainId column to listings table to track which network each listing is on
ALTER TABLE listings ADD COLUMN chain_id INTEGER NOT NULL DEFAULT 20994;

-- Add chainId column to nfts table
ALTER TABLE nfts ADD COLUMN chain_id INTEGER NOT NULL DEFAULT 20994;

-- Add chainId column to transactions table
ALTER TABLE transactions ADD COLUMN chain_id INTEGER NOT NULL DEFAULT 20994;

-- Add chainId column to offers table
ALTER TABLE offers ADD COLUMN chain_id INTEGER NOT NULL DEFAULT 20994;

-- Create index on chain_id for better query performance
CREATE INDEX idx_listings_chain_id ON listings(chain_id);
CREATE INDEX idx_nfts_chain_id ON nfts(chain_id);
CREATE INDEX idx_transactions_chain_id ON transactions(chain_id);
CREATE INDEX idx_offers_chain_id ON offers(chain_id);

COMMENT ON COLUMN listings.chain_id IS 'Chain ID where this listing exists (20994 for Fluent, 11155931 for RISE)';
COMMENT ON COLUMN nfts.chain_id IS 'Chain ID where this NFT was minted (20994 for Fluent, 11155931 for RISE)';
COMMENT ON COLUMN transactions.chain_id IS 'Chain ID where this transaction occurred (20994 for Fluent, 11155931 for RISE)';
COMMENT ON COLUMN offers.chain_id IS 'Chain ID where this offer was made (20994 for Fluent, 11155931 for RISE)';