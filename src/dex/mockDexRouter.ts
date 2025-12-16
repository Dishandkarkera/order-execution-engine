import { DexOption } from '../types/order.types';
import { logger } from '../utils/logger';

const DEX_OPTIONS = [
  'Uniswap V3',
  'Uniswap V2',
  'Sushiswap',
  'PancakeSwap',
  'Curve',
  '1inch',
];

export function selectBestDex(tokenIn: string, tokenOut: string, amountIn: number): DexOption {
  // Mock DEX selection logic - randomly select a DEX
  const randomIndex = Math.floor(Math.random() * DEX_OPTIONS.length);
  const selectedDex = DEX_OPTIONS[randomIndex];
  
  // Mock estimated rate with some randomness
  const baseRate = 1 + Math.random() * 0.1; // 1.0 to 1.1
  const estimatedRate = baseRate * amountIn;

  logger.info({
    selectedDex,
    tokenIn,
    tokenOut,
    amountIn,
    estimatedRate,
  }, 'DEX routing completed');

  return {
    name: selectedDex,
    estimatedRate,
  };
}

export function generateMockTxHash(): string {
  // Generate a mock transaction hash
  const randomHex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  return `0x${randomHex}`;
}
