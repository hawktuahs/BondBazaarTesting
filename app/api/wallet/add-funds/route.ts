import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await request.json()

    if (!amount || amount < 1000) {
      return NextResponse.json({ error: 'Minimum funding amount is ₹1,000' }, { status: 400 })
    }

    // Find or create cash balance
    const cashBalance = await prisma.balance.upsert({
      where: {
        userId_bondId: {
          userId: user.id,
          bondId: 'CASH'
        }
      },
      update: {
        tokenQty: {
          increment: amount
        }
      },
      create: {
        userId: user.id,
        bondId: 'CASH',
        tokenQty: amount
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        type: 'FUND_WALLET',
        details: JSON.stringify({
          userId: user.id,
          amount,
          method: 'UPI',
          transactionId: `TXN${Date.now()}`,
          description: `Added ₹${amount.toLocaleString('en-IN')} via UPI`
        })
      }
    })

    return NextResponse.json({
      success: true,
      newBalance: cashBalance.tokenQty,
      message: `Successfully added ₹${amount.toLocaleString('en-IN')} to your wallet`
    })

  } catch (error) {
    console.error('Add funds error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
