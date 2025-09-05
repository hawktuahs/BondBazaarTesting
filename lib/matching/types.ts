export interface OrderBookEntry {
  id: string
  userId: string
  price: number
  qty: number
  qtyFilled: number
  createdAt: Date
}

export interface TradeResult {
  id: string
  bondId: string
  buyOrderId: string
  sellOrderId: string
  price: number
  qty: number
  timestamp: Date
}

export interface MatchResult {
  trades: TradeResult[]
  updatedOrders: {
    id: string
    qtyFilled: number
    status: 'OPEN' | 'PARTIAL' | 'FILLED'
  }[]
}

export interface OrderBook {
  bids: OrderBookEntry[] // sorted desc by price, then asc by time
  asks: OrderBookEntry[] // sorted asc by price, then asc by time
}
