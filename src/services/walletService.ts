import { Asset, WalletData } from '../types';
import { supabase } from '../lib/supabase';
import { getNFTs, getTokens, getAirdrops } from './api/moralis';

export async function saveWalletAddress(userId: string, address: string) {
  try {
    // First check if the address already exists for this user
    const { data: existing } = await supabase
      .from('wallet_addresses')
      .select('id')
      .match({ user_id: userId, address: address.toLowerCase() })
      .single();

    if (existing) {
      // Address already exists, just update the timestamp
      const { error } = await supabase
        .from('wallet_addresses')
        .update({ updated_at: new Date().toISOString() })
        .match({ id: existing.id });

      if (error) throw error;
    } else {
      // New address, insert it
      const { error } = await supabase
        .from('wallet_addresses')
        .insert({ 
          user_id: userId,
          address: address.toLowerCase(), // Ensure consistent case for addresses
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving wallet address:', error);
    throw new Error('Failed to save wallet address. Please try again.');
  }
}

export async function fetchWalletData(address: string): Promise<WalletData> {
  try {
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid wallet address');
    }

    // Normalize the address
    const normalizedAddress = address.toLowerCase();

    // Fetch all data in parallel with error handling for each promise
    const [nfts, tokens, airdrops] = await Promise.all([
      getNFTs(normalizedAddress),
      getTokens(normalizedAddress),
      getAirdrops(normalizedAddress)
    ]);

    // Combine all assets with proper error handling
    const assets: Asset[] = [...(nfts || []), ...(tokens || []), ...(airdrops || [])];

    // Group assets by status
    const now = new Date();
    const categorizedAssets = assets.reduce((acc, asset) => {
      if (!asset) return acc;
      
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

      if (asset.type === 'airdrop') {
        if (new Date(asset.expiresIn) < now) {
          acc.expired.push(asset);
        } else {
          acc.unclaimed.push(asset);
        }
      } else {
        acc.claimed.push(asset);
      }
      return acc;
    }, {
      unclaimed: [] as Asset[],
      claimed: [] as Asset[],
      expired: [] as Asset[]
    });

    // Calculate totals with null checks
    const chains = [...new Set(assets.filter(asset => asset?.chain).map(asset => asset.chain))];
    const totalValue = assets.reduce((sum, asset) => 
      sum + (asset ? parseFloat(asset.value || '0') : 0), 0
    );

    return {
      assets: categorizedAssets.unclaimed,
      claimed: categorizedAssets.claimed,
      expired: categorizedAssets.expired,
      totalValue,
      chains,
      isPremium: false
    };
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    return {
      assets: [],
      claimed: [],
      expired: [],
      totalValue: 0,
      chains: [],
      isPremium: false
    };
  }
}