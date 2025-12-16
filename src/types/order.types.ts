export type OrderStatus =
  | 'pending'
  | 'routing'
  | 'building'
  | 'submitted'
  | 'confirmed'
  | 'failed';

export interface Order {
  id: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippage: number;
  status: OrderStatus;
  createdAt: Date;
}

export interface OrderRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippage?: number;
}

export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
  wsUrl: string;
}

export interface OrderUpdate {
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  metadata?: {
    selectedDex?: string;
    txHash?: string;
    message?: string;
  };
}

export interface DexOption {
  name: string;
  estimatedRate: number;
}
