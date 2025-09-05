import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { matchingEngine } from '@/lib/matching/engine'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const orderId = params.id

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (order.status === 'FILLED' || order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Order cannot be cancelled' },
        { status: 400 }
      )
    }

    // Remove from matching engine
    matchingEngine.removeOrder(order.bondId, orderId)

    // Update order status in database
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        type: 'ORDER_CANCELLED',
        details: JSON.stringify({
          orderId,
          userId: user.id,
          bondId: order.bondId,
          side: order.side,
          price: order.price,
          qty: order.qty,
          qtyFilled: order.qtyFilled
        })
      }
    })

    return NextResponse.json({
      order: updatedOrder,
      message: 'Order cancelled successfully'
    })

  } catch (error) {
    console.error('Order cancellation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
