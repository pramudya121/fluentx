import { ethers } from 'ethers';
import { SUPPORTED_NETWORKS } from './config';

interface NetworkStats {
  gasPrice: string;
  blockTime: string;
  blockNumber: number;
}

export async function getNetworkStats(chainId: number): Promise<NetworkStats> {
  const network = SUPPORTED_NETWORKS[chainId];
  
  if (!network) {
    throw new Error('Unsupported network');
  }

  try {
    // Create provider for the network
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);

    // Fetch current block number
    const blockNumber = await provider.getBlockNumber();

    // Fetch gas price
    const feeData = await provider.getFeeData();
    const gasPriceWei = feeData.gasPrice || BigInt(0);
    const gasPriceGwei = ethers.formatUnits(gasPriceWei, 'gwei');
    const gasPriceFormatted = `${parseFloat(gasPriceGwei).toFixed(2)} Gwei`;

    // Estimate block time by getting last two blocks
    let blockTime = '~2s'; // Default estimate
    try {
      const currentBlock = await provider.getBlock(blockNumber);
      const previousBlock = await provider.getBlock(blockNumber - 1);
      
      if (currentBlock && previousBlock) {
        const timeDiff = currentBlock.timestamp - previousBlock.timestamp;
        blockTime = `~${timeDiff}s`;
      }
    } catch (error) {
      console.log('Could not calculate exact block time, using estimate');
    }

    return {
      gasPrice: gasPriceFormatted,
      blockTime,
      blockNumber,
    };
  } catch (error) {
    console.error('Error fetching network stats:', error);
    throw error;
  }
}
