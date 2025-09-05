import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * Primary Market: Issuer creates initial sell orders after minting
 * This makes newly minted bonds available for purchase by investors
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const bondId = params.id
    const { price, quantity } = await request.json()

    // Validate inputs
    if (!price || !quantity || price <= 0 || quantity <= 0) {
      return NextResponse.json({ 
        error: 'Invalid price or quantity' 
      }, { status: 400 })
    }

    // Get bond and verify issuer ownership
    const bond = await prisma.bond.findUnique({
      where: { id: bondId },
      include: {
        balances: { where: { userId: user.id } },
        orders: { where: { side: 'SELL', status: 'OPEN' } }
      }
    })

    if (!bond) {
      return NextResponse.json({ error: 'Bond not found' }, { status: 404 })
    }

    // Check if user is the issuer (has balance from minting)
    const issuerBalance = bond.balances[0]
    if (!issuerBalance || issuerBalance.tokenQty < quantity) {
      return NextResponse.json({
        error: 'Insufficient tokens to issue',
        details: `You own ${issuerBalance?.tokenQty || 0} tokens but trying to issue ${quantity}`,
        suggestion: 'You can only issue tokens you own as the bond issuer'
      }, { status: 400 })
    }

    // Calculate current available supply for sale
    const availableForSale = bond.orders.reduce((sum, order) => sum + (order.qty - order.qtyFilled), 0)
    const totalIssued = availableForSale + quantity

    if (totalIssued > bond.outstandingUnits) {
      return NextResponse.json({
        error: 'Cannot issue more than total supply',
        details: `Total supply: ${bond.outstandingUnits}, Already for sale: ${availableForSale}, Trying to add: ${quantity}`,
        maxAvailable: bond.outstandingUnits - availableForSale
      }, { status: 400 })
    }

    // Create sell order for the issuer (primary market)
    const sellOrder = await prisma.order.create({
      data: {
        userId: user.id,
        bondId: bondId,
        side: 'SELL',
        price: price,
        qty: quantity,
        status: 'OPEN'
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        type: 'ISSUE_BONDS',
        details: JSON.stringify({
          userId: user.id,
          bondSymbol: bond.symbol,
          orderId: sellOrder.id,
          price: price,
          quantity: quantity,
          totalValue: price * quantity,
          marketType: 'PRIMARY'
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully issued ${quantity} ${bond.symbol} bonds at ₹${price} each`,
      orderId: sellOrder.id,
      bondSymbol: bond.symbol,
      contractAddress: bond.contractAddress,
      details: {
        pricePerToken: price,
        quantity: quantity,
        totalValue: price * quantity,
        nowAvailableForSale: availableForSale + quantity,
        totalSupply: bond.outstandingUnits
      }
    })

  } catch (error: any) {
    console.error('Bond issuance error:', error)
    return NextResponse.json({
      error: 'Failed to issue bonds',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Get current issuance status for a bond
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const bondId = params.id

    const bond = await prisma.bond.findUnique({
      where: { id: bondId },
      include: {
        balances: { where: { userId: user.id } },
        orders: { 
          where: { side: 'SELL', status: 'OPEN' },
          orderBy: { price: 'asc' }
        }
      }
    })

    if (!bond) {
      return NextResponse.json({ error: 'Bond not found' }, { status: 404 })
    }

    const issuerBalance = bond.balances[0]
    const availableForSale = bond.orders.reduce((sum, order) => sum + (order.qty - order.qtyFilled), 0)
    const canIssueMore = (issuerBalance?.tokenQty || 0) > 0

    return NextResponse.json({
      bondSymbol: bond.symbol,
      bondName: bond.name,
      totalSupply: bond.outstandingUnits,
      issuerBalance: issuerBalance?.tokenQty || 0,
      currentlyForSale: availableForSale,
      canIssueMore: canIssueMore,
      sellOrders: bond.orders.map(order => ({
        id: order.id,
        price: order.price,
        quantity: order.qty,
        filled: order.qtyFilled,
        remaining: order.qty - order.qtyFilled
      })),
      contractAddress: bond.contractAddress
    })

  } catch (error: any) {
    console.error('Get issuance status error:', error)
    return NextResponse.json({
      error: 'Failed to get issuance status'
    }, { status: 500 })
  }
}
