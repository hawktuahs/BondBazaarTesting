import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * Fix missing balance records for minted bonds
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Find bonds with contract addresses but no balance for this user
    const bondsNeedingBalance = await prisma.bond.findMany({
      where: {
        contractAddress: { not: null },
        balances: {
          none: { userId: user.id }
        }
      }
    })

    if (bondsNeedingBalance.length === 0) {
      return NextResponse.json({
        message: 'No bonds need balance fixes',
        bondsChecked: 0
      })
    }

    // Create balance records for each bond
    const balancePromises = bondsNeedingBalance.map(bond =>
      prisma.balance.create({
        data: {
          userId: user.id,
          bondId: bond.id,
          tokenQty: bond.outstandingUnits
        }
      })
    )

    const createdBalances = await Promise.all(balancePromises)

    // Create audit logs
    const auditPromises = createdBalances.map((balance, index) => {
      const bond = bondsNeedingBalance[index]
      return prisma.auditLog.create({
        data: {
          type: 'FIX_BALANCE',
          details: JSON.stringify({
            bondSymbol: bond.symbol,
            bondId: bond.id,
            userId: user.id,
            tokenQty: balance.tokenQty,
            reason: 'Fixed missing balance for minted bond'
          })
        }
      })
    })

    await Promise.all(auditPromises)

    return NextResponse.json({
      success: true,
      message: 'Balance records created successfully',
      fixedBonds: bondsNeedingBalance.map((bond, index) => ({
        symbol: bond.symbol,
        tokenQty: createdBalances[index].tokenQty,
        contractAddress: bond.contractAddress
      }))
    })

  } catch (error: any) {
    console.error('Balance fix error:', error)
    return NextResponse.json({
      error: 'Failed to fix balances',
      details: error.message
    }, { status: 500 })
  }
}
