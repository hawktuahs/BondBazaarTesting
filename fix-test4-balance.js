const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixTEST4Balance() {
  try {
    // Find TEST4 bond
    const test4Bond = await prisma.bond.findFirst({
      where: { symbol: 'TEST4' },
      include: { balances: true }
    })

    if (!test4Bond) {
      console.log('❌ TEST4 bond not found')
      return
    }

    console.log(`✅ Found TEST4 bond: ${test4Bond.id}`)
    console.log(`   Contract: ${test4Bond.contractAddress}`)
    console.log(`   Supply: ${test4Bond.outstandingUnits}`)
    console.log(`   Existing balances: ${test4Bond.balances.length}`)

    if (test4Bond.balances.length > 0) {
      console.log('✅ Balance already exists')
      test4Bond.balances.forEach(balance => {
        console.log(`   User: ${balance.userId}, Tokens: ${balance.tokenQty}`)
      })
      return
    }

    // Find user (first user in system - typically the issuer)
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ No users found')
      return
    }

    console.log(`✅ Found user: ${user.email}`)

    // Create balance record
    const balance = await prisma.balance.create({
      data: {
        userId: user.id,
        bondId: test4Bond.id,
        tokenQty: test4Bond.outstandingUnits
      }
    })

    console.log(`✅ Created balance record:`)
    console.log(`   User: ${user.email}`)
    console.log(`   Bond: ${test4Bond.symbol}`)
    console.log(`   Tokens: ${balance.tokenQty}`)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        type: 'FIX_BALANCE',
        details: JSON.stringify({
          bondSymbol: test4Bond.symbol,
          userId: user.id,
          tokenQty: balance.tokenQty,
          reason: 'Added missing balance for TEST4 bond'
        })
      }
    })

    console.log('✅ Balance fix complete!')

  } catch (error) {
    console.error('❌ Error fixing balance:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTEST4Balance()
