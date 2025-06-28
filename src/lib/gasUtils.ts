/**
 * Gas Management Utility
 * Provides dynamic gas estimation and network-specific configurations
 */

import { ethers } from 'ethers';

// Network-specific gas configurations
const NETWORK_GAS_CONFIG = {
  // Ethereum Sepolia
  11155111: {
    name: 'sepolia',
    baseFeeMultiplier: 1.2,
    priorityFeeGwei: 2,
    gasLimitMultiplier: 1.3,
    maxGasPriceGwei: 200,
    minGasPriceGwei: 1,
  },
  // Avalanche Fuji
  43113: {
    name: 'fuji', 
    baseFeeMultiplier: 1.1,
    priorityFeeGwei: 1,
    gasLimitMultiplier: 1.2,
    maxGasPriceGwei: 100,
    minGasPriceGwei: 25,
  },
} as const;

// Function-specific gas limit overrides
const FUNCTION_GAS_LIMITS = {
  openLeveragePosition: 800000,
  closeLeveragePosition: 600000,
  addLiquidity: 400000,
  removeLiquidity: 400000,
  mintToken: 200000,
  approval: 150000,
  borrowMoreUSDC: 300000,
  default: 500000,
} as const;

export interface GasSettings {
  gasLimit: number;
  gasPrice?: ethers.BigNumber;
  maxFeePerGas?: ethers.BigNumber;
  maxPriorityFeePerGas?: ethers.BigNumber;
}

/**
 * Get network configuration for gas settings
 */
function getNetworkConfig(chainId: number) {
  return NETWORK_GAS_CONFIG[chainId as keyof typeof NETWORK_GAS_CONFIG] || NETWORK_GAS_CONFIG[11155111];
}

/**
 * Estimate gas price using network data with fallbacks
 */
export async function estimateGasPrice(
  provider: ethers.providers.Provider,
  chainId: number
): Promise<Pick<GasSettings, 'gasPrice' | 'maxFeePerGas' | 'maxPriorityFeePerGas'>> {
  const config = getNetworkConfig(chainId);
  
  try {
    // Try EIP-1559 estimation first
    const feeData = await provider.getFeeData();
    
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // EIP-1559 supported
      const maxPriorityFeePerGas = ethers.utils.parseUnits(config.priorityFeeGwei.toString(), 'gwei');
      
      // To ensure maxFeePerGas >= maxPriorityFeePerGas, we derive the base fee from the provider's
      // recommendation, apply our multiplier, and then add our configured priority fee.
      const estimatedBaseFee = feeData.maxFeePerGas.sub(feeData.maxPriorityFeePerGas);
      const multipliedBaseFee = estimatedBaseFee.mul(Math.floor(config.baseFeeMultiplier * 100)).div(100);
      const maxFeePerGas = multipliedBaseFee.add(maxPriorityFeePerGas);

      // Apply caps to the total fee
      let cappedMaxFee = maxFeePerGas.gt(ethers.utils.parseUnits(config.maxGasPriceGwei.toString(), 'gwei'))
        ? ethers.utils.parseUnits(config.maxGasPriceGwei.toString(), 'gwei')
        : maxFeePerGas;
      
      // Ensure maxFeePerGas is at least maxPriorityFeePerGas after capping.
      if (cappedMaxFee.lt(maxPriorityFeePerGas)) {
        cappedMaxFee = maxPriorityFeePerGas;
      }

      return {
        maxFeePerGas: cappedMaxFee,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
      };
    } else if (feeData.gasPrice) {
      // Legacy gas pricing
      const gasPrice = feeData.gasPrice.mul(Math.floor(config.baseFeeMultiplier * 100)).div(100);
      
      // Apply caps
      const cappedGasPrice = gasPrice.gt(ethers.utils.parseUnits(config.maxGasPriceGwei.toString(), 'gwei'))
        ? ethers.utils.parseUnits(config.maxGasPriceGwei.toString(), 'gwei')
        : gasPrice.lt(ethers.utils.parseUnits(config.minGasPriceGwei.toString(), 'gwei'))
        ? ethers.utils.parseUnits(config.minGasPriceGwei.toString(), 'gwei')
        : gasPrice;
      
      return { gasPrice: cappedGasPrice };
    }
  } catch (error) {
    console.warn('Gas price estimation failed, using fallback:', error);
  }
  
  // Fallback to network defaults
  return {
    gasPrice: ethers.utils.parseUnits(config.minGasPriceGwei.toString(), 'gwei'),
  };
}

/**
 * Estimate gas limit for a specific function with safety margin
 */
export async function estimateGasLimit(
  contract: ethers.Contract,
  functionName: string,
  args: unknown[],
  overrides: Record<string, unknown> = {}
): Promise<number> {
  const config = getNetworkConfig(await contract.provider.getNetwork().then(n => n.chainId));
  const baseGasLimit = FUNCTION_GAS_LIMITS[functionName as keyof typeof FUNCTION_GAS_LIMITS] || FUNCTION_GAS_LIMITS.default;
  
  try {
    // Try to estimate actual gas usage
    const estimatedGas = await contract.estimateGas[functionName](...args, overrides);
    const gasWithMargin = estimatedGas.mul(Math.floor(config.gasLimitMultiplier * 100)).div(100);
    
    // Use the higher of base limit or estimated + margin
    return Math.max(baseGasLimit, gasWithMargin.toNumber());
  } catch (error) {
    console.warn(`Gas estimation failed for ${functionName}, using base limit:`, error);
    return baseGasLimit;
  }
}

/**
 * Get complete gas settings for a transaction
 */
export async function getGasSettings(
  provider: ethers.providers.Provider,
  chainId: number,
  functionName: string = 'default',
  contract?: ethers.Contract,
  args?: unknown[],
  overrides?: Record<string, unknown>
): Promise<GasSettings> {
  // Get gas price settings
  const gasPriceSettings = await estimateGasPrice(provider, chainId);
  
  // Get gas limit
  let gasLimit: number;
  if (contract && args) {
    gasLimit = await estimateGasLimit(contract, functionName, args, overrides);
  } else {
    gasLimit = FUNCTION_GAS_LIMITS[functionName as keyof typeof FUNCTION_GAS_LIMITS] || FUNCTION_GAS_LIMITS.default;
  }
  
  return {
    gasLimit,
    ...gasPriceSettings,
  };
}

/**
 * Retry transaction with increased gas settings
 */
export async function retryWithIncreasedGas(
  originalSettings: GasSettings,
  attempt: number = 1
): Promise<GasSettings> {
  const multiplier = 1 + (attempt * 0.2); // Increase by 20% each attempt
  
  return {
    gasLimit: Math.floor(originalSettings.gasLimit * multiplier),
    gasPrice: originalSettings.gasPrice?.mul(Math.floor(multiplier * 100)).div(100),
    maxFeePerGas: originalSettings.maxFeePerGas?.mul(Math.floor(multiplier * 100)).div(100),
    maxPriorityFeePerGas: originalSettings.maxPriorityFeePerGas?.mul(Math.floor(multiplier * 100)).div(100),
  };
}

/**
 * Check if error is gas-related and can be retried
 */
export function isGasError(error: unknown): boolean {
  const errorMessage = (error as Error)?.message?.toLowerCase() || '';
  const gasErrorPatterns = [
    'out of gas',
    'gas limit',
    'gas price',
    'insufficient gas',
    'transaction underpriced',
    'replacement transaction underpriced',
    'intrinsic gas too low',
  ];
  
  return gasErrorPatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Format gas settings for logging
 */
export function formatGasSettings(settings: GasSettings): string {
  const parts = [`gasLimit: ${settings.gasLimit.toLocaleString()}`];
  
  if (settings.gasPrice) {
    parts.push(`gasPrice: ${ethers.utils.formatUnits(settings.gasPrice, 'gwei')} gwei`);
  }
  if (settings.maxFeePerGas) {
    parts.push(`maxFeePerGas: ${ethers.utils.formatUnits(settings.maxFeePerGas, 'gwei')} gwei`);
  }
  if (settings.maxPriorityFeePerGas) {
    parts.push(`maxPriorityFeePerGas: ${ethers.utils.formatUnits(settings.maxPriorityFeePerGas, 'gwei')} gwei`);
  }
  
  return parts.join(', ');
}