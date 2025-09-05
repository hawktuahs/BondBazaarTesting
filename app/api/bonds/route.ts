import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { matchingEngine } from '@/lib/matching/engine'

export async function GET(request: NextRequest) {
  try {
    const bonds = await prisma.bond.findMany({
      orderBy: { symbol: 'asc' }
    })

    // Get recent trades and best bid/ask for each bond
    const bondsWithMarketData = await Promise.all(
      bonds.map(async (bond) => {
        // Get last trade price
        const lastTrade = await prisma.trade.findFirst({
          where: { bondId: bond.id },
          orderBy: { timestamp: 'desc' }
        })

        // Get 24h volume
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const volume24h = await prisma.trade.aggregate({
          where: {
            bondId: bond.id,
            timestamp: { gte: oneDayAgo }
          },
          _sum: { qty: true }
        })

        // Get best bid/ask from matching engine
        const { bestBid, bestAsk } = matchingEngine.getBestBidAsk(bond.id)

        return {
          ...bond,
          lastPrice: lastTrade?.price || null,
          bestBid,
          bestAsk,
          volume24h: volume24h._sum.qty || 0
        }
      })
    )

    return NextResponse.json(bondsWithMarketData)
  } catch (error) {
    console.error('Bonds fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
