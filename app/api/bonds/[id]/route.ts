import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { matchingEngine } from '@/lib/matching/engine'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bondId = params.id

    const bond = await prisma.bond.findUnique({
      where: { id: bondId }
    })

    if (!bond) {
      return NextResponse.json(
        { error: 'Bond not found' },
        { status: 404 }
      )
    }

    // Get recent trades (last 20)
    const recentTrades = await prisma.trade.findMany({
      where: { bondId },
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: {
        buyOrder: {
          select: { userId: true }
        },
        sellOrder: {
          select: { userId: true }
        }
      }
    })

    // Get order book snapshot
    const topOfBook = matchingEngine.getTopOfBook(bondId, 5)

    // Get best bid/ask
    const { bestBid, bestAsk } = matchingEngine.getBestBidAsk(bondId)

    // Get last price
    const lastPrice = recentTrades.length > 0 ? recentTrades[0].price : null

    return NextResponse.json({
      bond,
      lastPrice,
      bestBid,
      bestAsk,
      orderBook: topOfBook,
      recentTrades: recentTrades.map(trade => ({
        id: trade.id,
        price: trade.price,
        qty: trade.qty,
        timestamp: trade.timestamp,
        txHash: trade.txHash
      }))
    })
  } catch (error) {
    console.error('Bond detail fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
