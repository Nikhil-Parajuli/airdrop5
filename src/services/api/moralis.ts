import Moralis from 'moralis';
import { EvmChain } from '@moralisweb3/common-evm-utils';
import { Asset } from '../../types';

let isMoralisInitialized = false;

async function initializeMoralis() {
  if (!isMoralisInitialized) {
    try {
      await Moralis.start({
        apiKey: import.meta.env.VITE_MORALIS_API_KEY
      });
      isMoralisInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Moralis:', error);
      throw new Error('Failed to initialize blockchain services');
    }
  }
}

const SUPPORTED_CHAINS = [
  { chain: EvmChain.ETHEREUM, name: 'Ethereum' },
  { chain: EvmChain.POLYGON, name: 'Polygon' },
  { chain: EvmChain.ARBITRUM, name: 'Arbitrum' },
  { chain: EvmChain.OPTIMISM, name: 'Optimism' }
];

export async function getNFTs(address: string): Promise<Asset[]> {
  try {
    await initializeMoralis();
    
    const results = await Promise.all(
      SUPPORTED_CHAINS.map(async ({ chain, name }) => {
        try {
          const response = await Moralis.EvmApi.nft.getWalletNFTs({
            address,
            chain,
            limit: 100,
            normalizeMetadata: true
          });
          
          return response.result.map(nft => ({
            id: `${nft.tokenAddress}-${nft.tokenId}`,
            type: 'nft',
            name: nft.metadata?.name || nft.name || 'Unknown NFT',
            value: '0',
            chain: name,
            expiresIn: 'Never',
            imageUrl: nft.metadata?.image || 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=128&h=128&fit=crop',
            claimUrl: `https://opensea.io/assets/${nft.tokenAddress}/${nft.tokenId}`
          }));
        } catch (error) {
          console.warn(`Failed to fetch NFTs for ${name}:`, error);
          return [];
        }
      })
    );

    return results.flat();
  } catch (error) {
    console.error('Moralis NFT error:', error);
    return [];
  }
}

export async function getTokens(address: string): Promise<Asset[]> {
  try {
    await initializeMoralis();
    
    const results = await Promise.all(
      SUPPORTED_CHAINS.map(async ({ chain, name }) => {
        try {
          const response = await Moralis.EvmApi.token.getWalletTokenBalances({
            address,
            chain
          });
          
          return response.result.map(token => ({
            id: token.token?.contractAddress || '',
            type: 'airdrop',
            name: token.token?.name || 'Unknown Token',
            value: token.value?.toString() || '0',
            chain: name,
            expiresIn: '30 days',
            imageUrl: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=128&h=128&fit=crop',
            claimUrl: `https://app.uniswap.org/#/swap?outputCurrency=${token.token?.contractAddress}`
          }));
        } catch (error) {
          console.warn(`Failed to fetch tokens for ${name}:`, error);
          return [];
        }
      })
    );

    return results.flat();
  } catch (error) {
    console.error('Moralis token error:', error);
    return [];
  }
}

export async function getAirdrops(address: string): Promise<Asset[]> {
  try {
    await initializeMoralis();
    
    const results = await Promise.all(
      SUPPORTED_CHAINS.map(async ({ chain, name }) => {
        try {
          const response = await Moralis.EvmApi.token.getWalletTokenTransfers({
            address,
            chain,
            limit: 100
          });
          
          return response.result
            .filter(transfer => 
              transfer.fromAddress === '0x0000000000000000000000000000000000000000' ||
              transfer.value?.toString() === '0'
            )
            .map(transfer => ({
              id: transfer.transactionHash,
              type: 'airdrop',
              name: `${transfer.token?.name || 'Unknown'} Airdrop`,
              value: transfer.value?.toString() || '0',
              chain: name,
              expiresIn: '30 days',
              imageUrl: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=128&h=128&fit=crop',
              claimUrl: `https://etherscan.io/tx/${transfer.transactionHash}`
            }));
        } catch (error) {
          console.warn(`Failed to fetch transfers for ${name}:`, error);
          return [];
        }
      })
    );

    return results.flat();
  } catch (error) {
    console.error('Moralis transfers error:', error);
    return [];
  }
}