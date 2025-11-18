import { ethers } from 'ethers';
import { getContract, getSigner, getProvider } from './wallet';
import { CONTRACTS, MARKETPLACE_ABI, SAKURA_NFT_ABI, OFFER_ABI } from './config';
import { supabase } from '@/integrations/supabase/client';

// Upload file to Supabase Storage
export async function uploadFileToStorage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `nfts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('nft-images')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('nft-images').getPublicUrl(filePath);
  return data.publicUrl;
}

// Create metadata JSON and upload
export async function createMetadata(name: string, description: string, imageUrl: string): Promise<string> {
  const metadata = {
    name,
    description,
    image: imageUrl,
    attributes: []
  };

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const metadataFile = new File([metadataBlob], 'metadata.json');
  
  const fileExt = 'json';
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `metadata/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('nft-metadata')
    .upload(filePath, metadataFile);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('nft-metadata').getPublicUrl(filePath);
  return data.publicUrl;
}

// Mint NFT
export async function mintNFT(
  file: File,
  name: string,
  description: string,
  ownerAddress: string
): Promise<{ tokenId: number; imageUrl: string; metadataUri: string }> {
  try {
    // Upload image to Supabase Storage
    const imageUrl = await uploadFileToStorage(file);
    
    // Create metadata
    const metadataUri = await createMetadata(name, description, imageUrl);
    
    // Get signer and provider
    const signer = await getSigner();
    if (!signer) {
      throw new Error('Please connect your wallet first');
    }

    const provider = await getProvider();
    if (!provider) {
      throw new Error('Unable to connect to network');
    }

    // Check balance
    const balance = await provider.getBalance(ownerAddress);
    if (balance === 0n) {
      throw new Error('Insufficient balance for gas fees. Please add some ETH to your wallet.');
    }

    // Get contract
    const nftContract = getContract(CONTRACTS.SAKURA_NFT, SAKURA_NFT_ABI, signer);
    
    // Estimate gas and add buffer
    let gasLimit;
    try {
      const estimatedGas = await nftContract.mintNFT.estimateGas(ownerAddress, metadataUri);
      gasLimit = (estimatedGas * 120n) / 100n; // Add 20% buffer
    } catch (gasError: any) {
      console.error('Gas estimation failed:', gasError);
      // Use a reasonable default gas limit if estimation fails
      gasLimit = 500000n;
    }

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;

    // Mint NFT with explicit gas parameters
    const tx = await nftContract.mintNFT(ownerAddress, metadataUri, {
      gasLimit,
      gasPrice
    });
    
    const receipt = await tx.wait();
    
    if (!receipt || receipt.status === 0) {
      throw new Error('Transaction failed. Please check your transaction on block explorer.');
    }
    
    // Get token ID from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = nftContract.interface.parseLog(log);
        return parsed?.name === 'Minted';
      } catch {
        return false;
      }
    });
    
    const parsedEvent = event ? nftContract.interface.parseLog(event) : null;
    const tokenId = parsedEvent ? Number(parsedEvent.args[1]) : 0;

    if (tokenId === 0) {
      throw new Error('Failed to get token ID from transaction');
    }

    // Save to Supabase
    const { error: insertError } = await supabase.from('nfts').insert({
      token_id: tokenId,
      contract_address: CONTRACTS.SAKURA_NFT,
      name,
      description,
      image_url: imageUrl,
      owner_address: ownerAddress.toLowerCase(),
      creator_address: ownerAddress.toLowerCase(),
      metadata_uri: metadataUri
    });

    if (insertError) {
      console.error('Error saving NFT to database:', insertError);
    }

    // Get the NFT ID for transaction record
    const { data: nftData } = await supabase
      .from('nfts')
      .select('id')
      .eq('token_id', tokenId)
      .eq('contract_address', CONTRACTS.SAKURA_NFT)
      .single();

    // Record transaction
    if (nftData) {
      await supabase.from('transactions').insert({
        nft_id: nftData.id,
        from_address: ethers.ZeroAddress,
        to_address: ownerAddress.toLowerCase(),
        type: 'mint',
        tx_hash: receipt.hash
      });
    }

    return { tokenId, imageUrl, metadataUri };
  } catch (error: any) {
    console.error('Error minting NFT:', error);
    
    // Provide more helpful error messages
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      throw new Error('Transaction was rejected by user');
    } else if (error.code === 'INSUFFICIENT_FUNDS' || error.code === -32000) {
      throw new Error('Insufficient funds for gas fees');
    } else if (error.code === 'NETWORK_ERROR') {
      throw new Error('Network error. Please check your connection and try again.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to mint NFT. Please check console for details.');
    }
  }
}

// List NFT
export async function listNFT(tokenId: number, price: string): Promise<number> {
  try {
    const signer = await getSigner();
    if (!signer) {
      throw new Error('Please connect your wallet first');
    }

    const priceInWei = ethers.parseEther(price);
    
    // Approve marketplace
    const nftContract = getContract(CONTRACTS.SAKURA_NFT, SAKURA_NFT_ABI, signer);
    const approveTx = await nftContract.approve(CONTRACTS.MARKETPLACE, tokenId);
    await approveTx.wait();

    // List on marketplace
    const marketplaceContract = getContract(CONTRACTS.MARKETPLACE, MARKETPLACE_ABI, signer);
    const listTx = await marketplaceContract.listNFT(CONTRACTS.SAKURA_NFT, tokenId, priceInWei);
    const receipt = await listTx.wait();
    
    // Get listing ID from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = marketplaceContract.interface.parseLog(log);
        return parsed?.name === 'Listed';
      } catch {
        return false;
      }
    });
    
    const parsedEvent = event ? marketplaceContract.interface.parseLog(event) : null;
    const listingId = parsedEvent ? Number(parsedEvent.args[0]) : 0;

    // Save to Supabase
    const nftData = await supabase
      .from('nfts')
      .select('id')
      .eq('token_id', tokenId)
      .eq('contract_address', CONTRACTS.SAKURA_NFT)
      .single();

    if (nftData.data) {
      await supabase.from('listings').insert({
        listing_id: listingId,
        nft_id: nftData.data.id,
        seller_address: (await signer.getAddress()).toLowerCase(),
        price: price,
        active: true
      });
    }

    return listingId;
  } catch (error: any) {
    console.error('Error listing NFT:', error);
    throw error;
  }
}

// Buy NFT
export async function buyNFT(listingId: number, price: string): Promise<void> {
  try {
    const signer = await getSigner();
    if (!signer) {
      throw new Error('Please connect your wallet first');
    }

    const marketplaceContract = getContract(CONTRACTS.MARKETPLACE, MARKETPLACE_ABI, signer);
    const priceInWei = ethers.parseEther(price);
    
    const tx = await marketplaceContract.buyNFT(listingId, { value: priceInWei });
    const receipt = await tx.wait();

    // Update database
    const listing = await supabase
      .from('listings')
      .select('*, nfts(*)')
      .eq('listing_id', listingId)
      .single();

    if (listing.data) {
      const buyerAddress = await signer.getAddress();
      
      // Update NFT owner
      await supabase
        .from('nfts')
        .update({ owner_address: buyerAddress.toLowerCase() })
        .eq('id', listing.data.nft_id);
      
      // Deactivate listing
      await supabase
        .from('listings')
        .update({ active: false })
        .eq('listing_id', listingId);
      
      // Record transaction
      await supabase.from('transactions').insert({
        nft_id: listing.data.nft_id,
        from_address: listing.data.seller_address,
        to_address: buyerAddress.toLowerCase(),
        price: price,
        type: 'sale',
        tx_hash: receipt.hash
      });
    }
  } catch (error: any) {
    console.error('Error buying NFT:', error);
    throw error;
  }
}

// Make offer
export async function makeOffer(tokenId: number, offerPrice: string): Promise<void> {
  try {
    const signer = await getSigner();
    if (!signer) {
      throw new Error('Please connect your wallet first');
    }

    const offerContract = getContract(CONTRACTS.OFFER, OFFER_ABI, signer);
    const priceInWei = ethers.parseEther(offerPrice);
    
    const tx = await offerContract.makeOffer(CONTRACTS.SAKURA_NFT, tokenId, { value: priceInWei });
    await tx.wait();

    // Save to database
    const nftData = await supabase
      .from('nfts')
      .select('id, owner_address')
      .eq('token_id', tokenId)
      .eq('contract_address', CONTRACTS.SAKURA_NFT)
      .single();

    if (nftData.data) {
      const offererAddress = await signer.getAddress();
      
      await supabase.from('offers').insert({
        nft_id: nftData.data.id,
        offerer_address: offererAddress.toLowerCase(),
        price: offerPrice,
        status: 'pending'
      });

      // Create notification for owner
      const ownerProfile = await supabase
        .from('profiles')
        .select('id')
        .eq('wallet_address', nftData.data.owner_address)
        .single();

      if (ownerProfile.data) {
        await supabase.from('notifications').insert({
          profile_id: ownerProfile.data.id,
          type: 'offer',
          title: 'New Offer Received',
          message: `You received an offer of ${offerPrice} ETH on your NFT`,
          related_nft_id: nftData.data.id
        });
      }
    }
  } catch (error: any) {
    console.error('Error making offer:', error);
    throw error;
  }
}

// Accept offer
export async function acceptOffer(tokenId: number, offererAddress: string): Promise<void> {
  try {
    const signer = await getSigner();
    if (!signer) {
      throw new Error('Please connect your wallet first');
    }

    // Approve NFT transfer
    const nftContract = getContract(CONTRACTS.SAKURA_NFT, SAKURA_NFT_ABI, signer);
    const approveTx = await nftContract.approve(CONTRACTS.OFFER, tokenId);
    await approveTx.wait();

    // Accept offer
    const offerContract = getContract(CONTRACTS.OFFER, OFFER_ABI, signer);
    const tx = await offerContract.acceptOffer(CONTRACTS.SAKURA_NFT, tokenId);
    const receipt = await tx.wait();

    // Update database
    const nftData = await supabase
      .from('nfts')
      .select('id')
      .eq('token_id', tokenId)
      .eq('contract_address', CONTRACTS.SAKURA_NFT)
      .single();

    if (nftData.data) {
      // Update NFT owner
      await supabase
        .from('nfts')
        .update({ owner_address: offererAddress.toLowerCase() })
        .eq('id', nftData.data.id);
      
      // Update offer status
      const offer = await supabase
        .from('offers')
        .update({ status: 'accepted' })
        .eq('nft_id', nftData.data.id)
        .eq('offerer_address', offererAddress.toLowerCase())
        .select()
        .single();
      
      // Record transaction
      if (offer.data) {
        await supabase.from('transactions').insert({
          nft_id: nftData.data.id,
          from_address: (await signer.getAddress()).toLowerCase(),
          to_address: offererAddress.toLowerCase(),
          price: offer.data.price,
          type: 'sale',
          tx_hash: receipt.hash
        });
      }
    }
  } catch (error: any) {
    console.error('Error accepting offer:', error);
    throw error;
  }
}

// Cancel offer
export async function cancelOffer(tokenId: number): Promise<void> {
  try {
    const signer = await getSigner();
    if (!signer) {
      throw new Error('Please connect your wallet first');
    }

    const offerContract = getContract(CONTRACTS.OFFER, OFFER_ABI, signer);
    const tx = await offerContract.cancelOffer(CONTRACTS.SAKURA_NFT, tokenId);
    await tx.wait();

    // Update database
    const offererAddress = await signer.getAddress();
    const nftData = await supabase
      .from('nfts')
      .select('id')
      .eq('token_id', tokenId)
      .eq('contract_address', CONTRACTS.SAKURA_NFT)
      .single();

    if (nftData.data) {
      await supabase
        .from('offers')
        .update({ status: 'cancelled' })
        .eq('nft_id', nftData.data.id)
        .eq('offerer_address', offererAddress.toLowerCase());
    }
  } catch (error: any) {
    console.error('Error cancelling offer:', error);
    throw error;
  }
}
