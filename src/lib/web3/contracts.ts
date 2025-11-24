import { ethers } from 'ethers';
import { getContract, getSigner, getProvider, getCurrentChainId } from './wallet';
import { CONTRACTS, MARKETPLACE_ABI, SAKURA_NFT_ABI, OFFER_ABI, SUPPORTED_NETWORKS } from './config';
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
    console.log('Starting NFT minting process...');
    
    // Get provider first to check network
    const provider = await getProvider();
    if (!provider) {
      throw new Error('Unable to connect to network. Please connect your wallet first.');
    }

    // Verify we're on a supported network
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log('Connected to network:', chainId);
    
    if (!SUPPORTED_NETWORKS[chainId]) {
      throw new Error(`Please switch to a supported network (Fluent Testnet or RISE Testnet)`);
    }

    // Get signer
    const signer = await getSigner();
    if (!signer) {
      throw new Error('Please connect your wallet first');
    }

    // Verify contract exists
    const contractCode = await provider.getCode(CONTRACTS.SAKURA_NFT);
    console.log('Contract code length:', contractCode.length);
    
    if (contractCode === '0x' || contractCode.length <= 2) {
      throw new Error('NFT contract not found at the specified address. Please ensure the contract is deployed on Fluent Testnet.');
    }
    
    // Upload image to Supabase Storage
    console.log('Uploading image...');
    const imageUrl = await uploadFileToStorage(file);
    console.log('Image uploaded:', imageUrl);
    
    // Create metadata
    console.log('Creating metadata...');
    const metadataUri = await createMetadata(name, description, imageUrl);
    console.log('Metadata created:', metadataUri);

    // Check balance
    const balance = await provider.getBalance(ownerAddress);
    console.log('Wallet balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance === 0n) {
      throw new Error('Insufficient balance for gas fees. Please add some ETH to your wallet.');
    }

    // Get contract
    console.log('Initializing contract...');
    const nftContract = getContract(CONTRACTS.SAKURA_NFT, SAKURA_NFT_ABI, signer);
    
    // Verify contract has mintNFT function
    if (typeof nftContract.mintNFT !== 'function') {
      throw new Error('Contract does not have mintNFT function. Please check the contract ABI.');
    }
    
    // Estimate gas and add buffer
    let gasLimit;
    try {
      console.log('Estimating gas for minting...');
      const estimatedGas = await nftContract.mintNFT.estimateGas(ownerAddress, metadataUri);
      gasLimit = (estimatedGas * 150n) / 100n; // Add 50% buffer for safety
      console.log('Gas estimated:', estimatedGas.toString(), 'with buffer:', gasLimit.toString());
    } catch (gasError: any) {
      console.error('Gas estimation failed:', gasError);
      
      // Provide specific error for gas estimation failure
      if (gasError.message.includes('execution reverted')) {
        throw new Error('Contract execution would fail. Please check if the contract is properly configured.');
      }
      
      // Use a higher default gas limit if estimation fails
      gasLimit = 800000n;
      console.log('Using default gas limit:', gasLimit.toString());
    }

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log('Gas price:', gasPrice?.toString());

    // Mint NFT with explicit gas parameters
    let tx;
    try {
      console.log('Sending mint transaction...');
      console.log('Parameters:', { 
        owner: ownerAddress, 
        metadataUri, 
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice?.toString()
      });
      
      tx = await nftContract.mintNFT(ownerAddress, metadataUri, {
        gasLimit,
        ...(gasPrice && { gasPrice })
      });
      
      console.log('Transaction sent successfully!');
      console.log('Transaction hash:', tx.hash);
    } catch (contractError: any) {
      console.error('Contract call failed:', contractError);
      console.error('Error details:', {
        code: contractError.code,
        message: contractError.message,
        reason: contractError.reason,
        data: contractError.data
      });
      
      // Parse specific error messages
      if (contractError.code === 'ACTION_REJECTED' || contractError.code === 4001) {
        throw new Error('Transaction was rejected by user');
      } else if (contractError.code === 'INSUFFICIENT_FUNDS' || contractError.code === -32000) {
        throw new Error('Insufficient funds for gas fees');
      } else if (contractError.code === -32603) {
        throw new Error('Contract execution failed. Please ensure you are on Fluent Testnet and the contract is properly deployed.');
      } else if (contractError.reason) {
        throw new Error(`Contract error: ${contractError.reason}`);
      } else if (contractError.message.includes('could not coalesce')) {
        throw new Error('Failed to decode contract response. Please verify the contract address and network.');
      } else if (contractError.message) {
        throw new Error(`Transaction failed: ${contractError.message}`);
      } else {
        throw new Error('Failed to send transaction. Please check your wallet and network connection.');
      }
    }
    
    let receipt;
    try {
      console.log('Waiting for transaction confirmation...');
      receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
    } catch (waitError: any) {
      console.error('Transaction wait failed:', waitError);
      throw new Error('Transaction confirmation failed. Please check the transaction status in your wallet.');
    }
    
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
      metadata_uri: metadataUri,
      chain_id: chainId
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
        tx_hash: receipt.hash,
        chain_id: chainId
      });
    }

    return { tokenId, imageUrl, metadataUri };
  } catch (error: any) {
    console.error('Error minting NFT:', error);
    
    // Provide user-friendly error messages based on error type
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      throw new Error('Transaction was rejected by user');
    } else if (error.code === 'INSUFFICIENT_FUNDS' || error.code === -32000) {
      throw new Error('Insufficient funds for gas fees');
    } else if (error.code === 'NETWORK_ERROR' || error.code === 'NETWORK_ERROR') {
      throw new Error('Network error. Please check your connection and try again.');
    } else if (error.code === -32603) {
      // Internal JSON-RPC error - usually contract revert
      throw new Error('Contract execution failed. Please ensure the contract address is correct and the network is Fluent Testnet.');
    } else if (error.reason) {
      throw new Error(`Contract error: ${error.reason}`);
    } else if (error.message && error.message.includes('could not coalesce')) {
      throw new Error('Contract call failed. Please verify you are connected to Fluent Testnet and the contract is deployed correctly.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to mint NFT. Please check your wallet connection and network settings.');
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

    const chainId = await getCurrentChainId();
    if (!chainId || !SUPPORTED_NETWORKS[chainId]) {
      throw new Error('Please connect to a supported network');
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
      .eq('chain_id', chainId)
      .single();

    if (nftData.data) {
      await supabase.from('listings').insert({
        listing_id: listingId,
        nft_id: nftData.data.id,
        seller_address: (await signer.getAddress()).toLowerCase(),
        price: price,
        active: true,
        chain_id: chainId
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
        tx_hash: receipt.hash,
        chain_id: listing.data.nfts.chain_id
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

    const chainId = await getCurrentChainId();
    if (!chainId || !SUPPORTED_NETWORKS[chainId]) {
      throw new Error('Please connect to a supported network');
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
      .eq('chain_id', chainId)
      .single();

    if (nftData.data) {
      const offererAddress = await signer.getAddress();
      
      await supabase.from('offers').insert({
        nft_id: nftData.data.id,
        offerer_address: offererAddress.toLowerCase(),
        price: offerPrice,
        status: 'pending',
        chain_id: chainId
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
          tx_hash: receipt.hash,
          chain_id: offer.data.chain_id
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
