import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { matchingEngine } from '@/lib/matching/engine'
import { getBlockchainService } from '@/lib/blockchain'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { bondId, side, price, qty } = await request.json()

    // Basic validation
    if (!bondId || !side || price === undefined || qty === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: bondId, side, price, qty' },
        { status: 400 }
      )
    }

    if (!['BUY', 'SELL'].includes(side)) {
      return NextResponse.json(
        { error: 'side must be BUY or SELL' },
        { status: 400 }
      )
    }

    if (price <= 0 || qty <= 0) {
      return NextResponse.json(
        { error: 'price and qty must be positive' },
        { status: 400 }
      )
    }

    // Get bond info for validation
    const bond = await prisma.bond.findUnique({
      where: { id: bondId },
      include: { 
        orders: { where: { status: 'OPEN', side: side === 'BUY' ? 'SELL' : 'BUY' } }
      }
    })
    
    if (!bond) {
      return NextResponse.json({ error: 'Bond not found' }, { status: 404 })
    }
    
    // Validate order quantity against available supply
    if (side === 'BUY') {
      const availableForSale = bond.orders.reduce((sum, order) => sum + (order.qty - order.qtyFilled), 0)
      
      if (availableForSale > 0 && qty > availableForSale) {
        return NextResponse.json({ 
          error: 'Insufficient supply', 
          details: `Only ${availableForSale} tokens available for purchase out of ${bond.outstandingUnits} total supply`,
          availableSupply: availableForSale,
          requestedQty: qty
        }, { status: 400 })
      }
    }
    
    // For sell orders, check user's actual token balance
    if (side === 'SELL') {
      const userBalance = await prisma.balance.findUnique({
        where: { userId_bondId: { userId: user.id, bondId: bondId } }
      })
      
      if (!userBalance || userBalance.tokenQty < qty) {
        return NextResponse.json({
          error: 'Insufficient balance',
          details: `You own ${userBalance?.tokenQty || 0} tokens but trying to sell ${qty}`,
          availableBalance: userBalance?.tokenQty || 0,
          requestedQty: qty
        }, { status: 400 })
      }
    }
    
    // Create order in database first to get ID
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        bondId,
        side,
        price,
        qty,
        status: 'OPEN'
      }
    })

    // Process the matching
    const orderBookEntry = {
      id: order.id,
      userId: user.id,
      bondId,
      side,
      price,
      qty,
      qtyFilled: 0,
      createdAt: order.createdAt
    }
    

    const matchResult = matchingEngine.addOrder(bondId, orderBookEntry, side as 'BUY' | 'SELL')

    // Process any trades that resulted from matching
    // Process any trades that occurred
    for (const trade of matchResult.trades) {
      // Save trade to database
      await prisma.trade.create({
        data: {
          id: trade.id,
          bondId: trade.bondId,
          buyOrderId: trade.buyOrderId,
          sellOrderId: trade.sellOrderId,
          price: trade.price,
          qty: trade.qty,
          timestamp: trade.timestamp
        }
      })

      // Update balances in SIM_MODE
      if (process.env.SIM_MODE === 'true') {
        await updateBalancesSimMode(trade)
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          type: 'TRADE',
          details: JSON.stringify({
            tradeId: trade.id,
            bondId: trade.bondId,
            price: trade.price,
            qty: trade.qty,
            mode: 'SIM_MODE'
          })
        }
      })

      // Execute real blockchain token transfer if not in simulation mode
      if (process.env.SIM_MODE !== 'true') {
        const blockchainService = getBlockchainService()
        if (blockchainService && bond?.contractAddress) {
          try {
            // Get user wallet addresses (for now using placeholder)
            const buyerWallet = '0x' + user.id.slice(0, 40).padEnd(40, '0') // Mock wallet mapping
            const sellerWallet = '0x' + (trade.buyOrderId || trade.sellOrderId || '').slice(0, 40).padEnd(40, '0')
            
            console.log(' Executing blockchain token transfer...')
            console.log(` Bond: ${bond.symbol} (${bond.contractAddress})`)
            console.log(` Transfer: ${trade.qty} tokens from ${sellerWallet} to ${buyerWallet}`)
            
            const txHash = await blockchainService.executeTokenTransfer(
              bond.contractAddress,
              sellerWallet,
              buyerWallet,
              trade.qty,
              trade.price
            )
            
            // Update trade with actual transaction hash
            await prisma.trade.update({
              where: { id: trade.id },
              data: { txHash }
            })
            
            console.log(' Blockchain transfer completed:', txHash)
          } catch (blockchainError) {
            console.error(' Blockchain transfer failed (continuing with DB):', blockchainError)
            // Mark trade as pending blockchain confirmation
            await prisma.trade.update({
              where: { id: trade.id },
              data: { txHash: `pending_${Date.now()}` }
            })
          }
        } else {
          console.log(' No blockchain service or contract address - DB only')
        }
      }
    }

    // Update order statuses in database
    for (const orderUpdate of matchResult.updatedOrders) {
      await prisma.order.update({
        where: { id: orderUpdate.id },
        data: {
          qtyFilled: orderUpdate.qtyFilled,
          status: orderUpdate.status
        }
      })
    }

    return NextResponse.json({
      order,
      trades: matchResult.trades,
      message: `Order placed successfully. ${matchResult.trades.length} trades executed.`
    })

  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function updateBalancesSimMode(trade: any) {
  // Get buy and sell orders to determine users
  const [buyOrder, sellOrder] = await Promise.all([
    prisma.order.findUnique({ where: { id: trade.buyOrderId } }),
    prisma.order.findUnique({ where: { id: trade.sellOrderId } })
  ])

  if (!buyOrder || !sellOrder) return

  // Update buyer's balance (increase tokens)
  await prisma.balance.upsert({
    where: {
      userId_bondId: { userId: buyOrder.userId, bondId: trade.bondId }
    },
    update: {
      tokenQty: { increment: trade.qty }
    },
    create: {
      userId: buyOrder.userId,
      bondId: trade.bondId,
      tokenQty: trade.qty
    }
  })

  // Update seller's balance (decrease tokens)
  await prisma.balance.upsert({
    where: {
      userId_bondId: { userId: sellOrder.userId, bondId: trade.bondId }
    },
    update: {
      tokenQty: { decrement: trade.qty }
    },
    create: {
      userId: sellOrder.userId,
      bondId: trade.bondId,
      tokenQty: -trade.qty // This shouldn't happen in practice
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
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

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
