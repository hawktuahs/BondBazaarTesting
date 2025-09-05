import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's balances
    const balances = await prisma.balance.findMany({
      where: { 
        userId: user.id,
        tokenQty: { gt: 0 }
      },
      include: {
        bond: {
          select: {
            id: true,
            symbol: true,
            name: true,
            couponPct: true,
            rating: true,
            faceValue: true,
            maturityDate: true
          }
        }
      }
    })

    // Get user's trade history
    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { buyOrder: { userId: user.id } },
          { sellOrder: { userId: user.id } }
        ]
      },
      include: {
        bond: {
          select: { symbol: true, name: true }
        },
        buyOrder: {
          select: { userId: true }
        },
        sellOrder: {
          select: { userId: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    })

    // Get user's open orders
    const openOrders = await prisma.order.findMany({
      where: {
        userId: user.id,
        status: { in: ['OPEN', 'PARTIAL'] }
      },
      include: {
        bond: {
          select: { symbol: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate portfolio value and P&L (simplified)
    const portfolioValue = balances.reduce((total, balance) => {
      return total + (balance.tokenQty * balance.bond.faceValue)
    }, 0)

    return NextResponse.json({
      balances: balances.map(balance => ({
        bondId: balance.bondId,
        bond: balance.bond,
        tokenQty: balance.tokenQty,
        faceValue: balance.tokenQty * balance.bond.faceValue
      })),
      trades: trades.map(trade => ({
        id: trade.id,
        bondSymbol: trade.bond.symbol,
        bondName: trade.bond.name,
        price: trade.price,
        qty: trade.qty,
        timestamp: trade.timestamp,
        side: trade.buyOrder.userId === user.id ? 'BUY' : 'SELL',
        txHash: trade.txHash
      })),
      openOrders: openOrders.map(order => ({
        id: order.id,
        bondSymbol: order.bond.symbol,
        bondName: order.bond.name,
        side: order.side,
        price: order.price,
        qty: order.qty,
        qtyFilled: order.qtyFilled,
        status: order.status,
        createdAt: order.createdAt
      })),
      portfolioValue
    })

  } catch (error) {
    console.error('Portfolio fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
