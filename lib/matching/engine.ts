import { OrderBookEntry, TradeResult, MatchResult, OrderBook } from './types'
import { randomUUID } from 'crypto'

export class MatchingEngine {
  private orderBooks: Map<string, OrderBook> = new Map()

  constructor() {}

  getOrderBook(bondId: string): OrderBook {
    if (!this.orderBooks.has(bondId)) {
      this.orderBooks.set(bondId, { bids: [], asks: [] })
    }
    return this.orderBooks.get(bondId)!
  }

  addOrder(bondId: string, order: OrderBookEntry, side: 'BUY' | 'SELL'): MatchResult {
    const book = this.getOrderBook(bondId)
    const trades: TradeResult[] = []
    const updatedOrders: { id: string; qtyFilled: number; status: 'OPEN' | 'PARTIAL' | 'FILLED' }[] = []

    let remainingQty = order.qty - order.qtyFilled

    if (order.price <= 0 || remainingQty <= 0) {
      return { trades, updatedOrders }
    }

    // Create a working copy of the order
    const workingOrder = { ...order }

    if (side === 'BUY') {
      // This is a BUY order - match against asks
      while (remainingQty > 0 && book.asks.length > 0) {
        const bestAsk = book.asks[0]
        
        if (workingOrder.price < bestAsk.price) break // No more matches possible

        const tradeQty = Math.min(remainingQty, bestAsk.qty - bestAsk.qtyFilled)
        const tradePrice = bestAsk.price // Price improvement for buyer

        // Create trade
        const trade: TradeResult = {
          id: randomUUID(),
          bondId,
          buyOrderId: workingOrder.id,
          sellOrderId: bestAsk.id,
          price: tradePrice,
          qty: tradeQty,
          timestamp: new Date()
        }
        trades.push(trade)

        // Update quantities
        workingOrder.qtyFilled += tradeQty
        bestAsk.qtyFilled += tradeQty
        remainingQty -= tradeQty

        // Update order statuses
        updatedOrders.push({
          id: workingOrder.id,
          qtyFilled: workingOrder.qtyFilled,
          status: workingOrder.qtyFilled >= workingOrder.qty ? 'FILLED' : 'PARTIAL'
        })

        updatedOrders.push({
          id: bestAsk.id,
          qtyFilled: bestAsk.qtyFilled,
          status: bestAsk.qtyFilled >= bestAsk.qty ? 'FILLED' : 'PARTIAL'
        })

        // Remove filled ask from book
        if (bestAsk.qtyFilled >= bestAsk.qty) {
          book.asks.shift()
        }
      }

      // Add remaining quantity to bids if any
      if (remainingQty > 0) {
        this.insertBid(book, workingOrder)
      }
    } else {
      // This is a SELL order - match against bids
      while (remainingQty > 0 && book.bids.length > 0) {
        const bestBid = book.bids[0]
        
        if (workingOrder.price > bestBid.price) break // No more matches possible

        const tradeQty = Math.min(remainingQty, bestBid.qty - bestBid.qtyFilled)
        const tradePrice = bestBid.price // Price improvement for seller

        // Create trade
        const trade: TradeResult = {
          id: randomUUID(),
          bondId,
          buyOrderId: bestBid.id,
          sellOrderId: workingOrder.id,
          price: tradePrice,
          qty: tradeQty,
          timestamp: new Date()
        }
        trades.push(trade)

        // Update quantities
        workingOrder.qtyFilled += tradeQty
        bestBid.qtyFilled += tradeQty
        remainingQty -= tradeQty

        // Update order statuses
        updatedOrders.push({
          id: workingOrder.id,
          qtyFilled: workingOrder.qtyFilled,
          status: workingOrder.qtyFilled >= workingOrder.qty ? 'FILLED' : 'PARTIAL'
        })

        updatedOrders.push({
          id: bestBid.id,
          qtyFilled: bestBid.qtyFilled,
          status: bestBid.qtyFilled >= bestBid.qty ? 'FILLED' : 'PARTIAL'
        })

        // Remove filled bid from book
        if (bestBid.qtyFilled >= bestBid.qty) {
          book.bids.shift()
        }
      }

      // Add remaining quantity to asks if any
      if (remainingQty > 0) {
        this.insertAsk(book, workingOrder)
      }
    }

    return { trades, updatedOrders }
  }

  private insertBid(book: OrderBook, order: OrderBookEntry) {
    // Insert in price-time priority: desc by price, then asc by time
    let insertIndex = 0
    for (let i = 0; i < book.bids.length; i++) {
      const existing = book.bids[i]
      if (order.price > existing.price) {
        insertIndex = i
        break
      } else if (order.price === existing.price && order.createdAt < existing.createdAt) {
        insertIndex = i
        break
      }
      insertIndex = i + 1
    }
    book.bids.splice(insertIndex, 0, order)
  }

  private insertAsk(book: OrderBook, order: OrderBookEntry) {
    // Insert in price-time priority: asc by price, then asc by time
    let insertIndex = 0
    for (let i = 0; i < book.asks.length; i++) {
      const existing = book.asks[i]
      if (order.price < existing.price) {
        insertIndex = i
        break
      } else if (order.price === existing.price && order.createdAt < existing.createdAt) {
        insertIndex = i
        break
      }
      insertIndex = i + 1
    }
    book.asks.splice(insertIndex, 0, order)
  }

  removeOrder(bondId: string, orderId: string) {
    const book = this.getOrderBook(bondId)
    book.bids = book.bids.filter(order => order.id !== orderId)
    book.asks = book.asks.filter(order => order.id !== orderId)
  }

  getBestBidAsk(bondId: string): { bestBid?: number; bestAsk?: number } {
    const book = this.getOrderBook(bondId)
    return {
      bestBid: book.bids.length > 0 ? book.bids[0].price : undefined,
      bestAsk: book.asks.length > 0 ? book.asks[0].price : undefined
    }
  }

  getTopOfBook(bondId: string, depth: number = 5) {
    const book = this.getOrderBook(bondId)
    return {
      bids: book.bids.slice(0, depth).map(order => ({
        price: order.price,
        qty: order.qty - order.qtyFilled
      })),
      asks: book.asks.slice(0, depth).map(order => ({
        price: order.price,
        qty: order.qty - order.qtyFilled
      }))
    }
  }
}

// Global singleton instance
export const matchingEngine = new MatchingEngine()
