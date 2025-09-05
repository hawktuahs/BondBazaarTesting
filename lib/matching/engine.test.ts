import { MatchingEngine } from './engine'
import { OrderBookEntry } from './types'

describe('MatchingEngine', () => {
  let engine: MatchingEngine

  beforeEach(() => {
    engine = new MatchingEngine()
  })

  const createOrder = (
    id: string,
    userId: string,
    price: number,
    qty: number,
    qtyFilled: number = 0,
    createdAt: Date = new Date()
  ): OrderBookEntry => ({
    id,
    userId,
    price,
    qty,
    qtyFilled,
    createdAt
  })

  test('should match buy order against sell order at ask price', () => {
    const bondId = 'test-bond'
    
    // Add a sell order first
    const sellOrder = createOrder('sell1', 'user2', 1000, 10)
    engine.addOrder(bondId, sellOrder)
    
    // Add a buy order that should match
    const buyOrder = createOrder('buy1', 'user1', 1005, 5)
    const result = engine.addOrder(bondId, buyOrder)
    
    expect(result.trades).toHaveLength(1)
    expect(result.trades[0].price).toBe(1000) // Price improvement for buyer
    expect(result.trades[0].qty).toBe(5)
    expect(result.trades[0].buyOrderId).toBe('buy1')
    expect(result.trades[0].sellOrderId).toBe('sell1')
    
    expect(result.updatedOrders).toHaveLength(2)
    expect(result.updatedOrders.find(o => o.id === 'buy1')?.status).toBe('FILLED')
    expect(result.updatedOrders.find(o => o.id === 'sell1')?.status).toBe('PARTIAL')
  })

  test('should handle partial fills correctly', () => {
    const bondId = 'test-bond'
    
    // Add multiple sell orders
    engine.addOrder(bondId, createOrder('sell1', 'user2', 1000, 5))
    engine.addOrder(bondId, createOrder('sell2', 'user3', 1001, 8))
    
    // Add a large buy order
    const buyOrder = createOrder('buy1', 'user1', 1002, 10)
    const result = engine.addOrder(bondId, buyOrder)
    
    expect(result.trades).toHaveLength(2)
    expect(result.trades[0].qty).toBe(5) // First trade fills sell1 completely
    expect(result.trades[1].qty).toBe(5) // Second trade partially fills sell2
    
    const buyOrderUpdate = result.updatedOrders.find(o => o.id === 'buy1')
    expect(buyOrderUpdate?.qtyFilled).toBe(10)
    expect(buyOrderUpdate?.status).toBe('FILLED')
  })

  test('should maintain price-time priority', () => {
    const bondId = 'test-bond'
    const now = new Date()
    const earlier = new Date(now.getTime() - 1000)
    
    // Add orders with same price but different times
    engine.addOrder(bondId, createOrder('sell1', 'user2', 1000, 5, 0, now))
    engine.addOrder(bondId, createOrder('sell2', 'user3', 1000, 5, 0, earlier))
    
    const topOfBook = engine.getTopOfBook(bondId, 2)
    
    // Earlier order should be first (better time priority)
    expect(topOfBook.asks[0]).toEqual({ price: 1000, qty: 5 })
    expect(topOfBook.asks[1]).toEqual({ price: 1000, qty: 5 })
  })

  test('should get best bid and ask correctly', () => {
    const bondId = 'test-bond'
    
    engine.addOrder(bondId, createOrder('buy1', 'user1', 995, 10))
    engine.addOrder(bondId, createOrder('buy2', 'user1', 990, 5))
    engine.addOrder(bondId, createOrder('sell1', 'user2', 1005, 8))
    engine.addOrder(bondId, createOrder('sell2', 'user2', 1010, 12))
    
    const { bestBid, bestAsk } = engine.getBestBidAsk(bondId)
    
    expect(bestBid).toBe(995)
    expect(bestAsk).toBe(1005)
  })
}
