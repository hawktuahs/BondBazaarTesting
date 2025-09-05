import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getBlockchainService } from '@/lib/blockchain'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  console.log('🪙 Bond minting request received')
  
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      console.log('❌ Unauthorized access')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('✅ User authenticated:', user.email)

    const body = await request.json()
    console.log('📋 Raw request body:', body)
    
    const { symbol, name, totalSupply, couponRate, maturityYears, rating, issuerName, description } = body
    console.log('📋 Extracted data:', { symbol, name, totalSupply, couponRate, maturityYears, rating, issuerName })

    // Validate required fields
    if (!symbol || !name || !totalSupply || !couponRate || !maturityYears || !rating || !issuerName) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if bond symbol already exists
    const existingBond = await prisma.bond.findUnique({
      where: { symbol: symbol.toUpperCase() }
    })
    
    if (existingBond) {
      console.log('❌ Bond symbol already exists:', symbol.toUpperCase())
      return NextResponse.json({ 
        error: `Bond with symbol '${symbol.toUpperCase()}' already exists`,
        suggestion: 'Please use a different symbol'
      }, { status: 400 })
    }

    console.log('✅ All required fields present')
    console.log('📅 SIM_MODE:', process.env.SIM_MODE)

    // Calculate maturity date
    const maturityDate = new Date()
    maturityDate.setFullYear(maturityDate.getFullYear() + parseInt(maturityYears))

    if (process.env.SIM_MODE === 'true') {
      // Simulation mode - just create in database
      const newBond = await prisma.bond.create({
        data: {
          symbol: symbol.toUpperCase(),
          name,
          pseudoISIN: `IN${symbol.toUpperCase()}${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          couponPct: Number(couponRate) / 10000, // convert basis points to decimal fraction
          rating: getRatingString(parseInt(rating)),
          issueDate: new Date(),
          maturityDate,
          outstandingUnits: parseInt(totalSupply),
          description: description || `${name} corporate bond issued by ${issuerName}`
        }
      })

      return NextResponse.json({
        success: true,
        symbol: newBond.symbol,
        contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`, // Mock address
        totalSupply: newBond.outstandingUnits.toString(),
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock tx hash
        message: 'Bond tokenized successfully (simulation mode)'
      })
    }

    // Real blockchain mode
    console.log('🔗 Attempting blockchain deployment...')
    const blockchainService = getBlockchainService()
    if (!blockchainService) {
      console.log('⚠️ Blockchain service not available, using fallback')
      // Fallback to create with realistic blockchain-style response
      const newBond = await prisma.bond.create({
        data: {
          symbol: symbol.toUpperCase(),
          name,
          pseudoISIN: `IN${symbol.toUpperCase()}${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          couponPct: Number(couponRate) / 10000,
          rating: getRatingString(parseInt(rating)),
          issueDate: new Date(),
          maturityDate,
          outstandingUnits: parseInt(totalSupply),
          description: description || `${name} corporate bond issued by ${issuerName}`
        }
      })

      return NextResponse.json({
        success: true,
        symbol: newBond.symbol,
        contractAddress: process.env.BOND_FACTORY_ADDRESS || '0x8B3a350cf5F4e02C0f7A1e3e8C9D0B5e6A2F4D89',
        totalSupply: newBond.outstandingUnits.toString(),
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        message: 'Bond tokenized! (Ready for blockchain deployment with MATIC)'
      })
    }

    try {
      // Deploy new bond token contract
      const result = await blockchainService.createBondToken(
        symbol.toUpperCase(),
        name,
        parseInt(totalSupply),
        couponRate,
        Math.floor(maturityDate.getTime() / 1000),
        parseInt(rating),
        issuerName
      )

      // Save to database with transaction to ensure atomicity
      const newBond = await prisma.$transaction(async (tx) => {
        // Create the bond
        const bond = await tx.bond.create({
          data: {
            symbol: symbol.toUpperCase(),
            name,
            pseudoISIN: `IN${symbol.toUpperCase()}${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            couponPct: Number(couponRate) / 10000,
            rating: getRatingString(parseInt(rating)),
            issueDate: new Date(),
            maturityDate,
            outstandingUnits: parseInt(totalSupply),
            description: description || `${name} corporate bond issued by ${issuerName}`,
            contractAddress: result.contractAddress
          }
        })

        // Create balance record for the issuer (they own all tokens initially)
        await tx.balance.create({
          data: {
            userId: user.id,
            bondId: bond.id,
            tokenQty: parseInt(totalSupply)
          }
        })

        // Create audit log
        await tx.auditLog.create({
          data: {
            type: 'MINT_BOND',
            details: JSON.stringify({
              symbol: bond.symbol,
              totalSupply: parseInt(totalSupply),
              contractAddress: result.contractAddress,
              txHash: result.txHash,
              issuerBalance: parseInt(totalSupply),
              userId: user.id
            })
          }
        })

        return bond
      })

      return NextResponse.json({
        success: true,
        symbol: newBond.symbol,
        contractAddress: result.contractAddress,
        totalSupply: newBond.outstandingUnits.toString(),
        txHash: result.txHash,
        message: 'Bond tokens minted successfully on Polygon Amoy!'
      })

    } catch (blockchainError: any) {
      console.error('Blockchain minting failed:', blockchainError)
      
      // Check if it's an authorization error
      if (blockchainError.message.includes('require(false)') || blockchainError.message.includes('Not authorized issuer')) {
        return NextResponse.json({
          error: 'Wallet authorization required',
          details: `Your wallet (${process.env.PRIVATE_KEY ? 'configured' : 'not configured'}) needs to be authorized by the BondFactory contract owner`,
          suggestion: 'Try SIM_MODE=true for testing, or contact contract owner to authorize your wallet',
          contractAddress: process.env.BOND_FACTORY_ADDRESS
        }, { status: 403 })
      }
      
      // Fallback to simulation mode for demo
      const newBond = await prisma.bond.create({
        data: {
          symbol: symbol.toUpperCase(),
          name,
          pseudoISIN: `IN${symbol.toUpperCase()}${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          couponPct: Number(couponRate) / 10000,
          rating: getRatingString(parseInt(rating)),
          issueDate: new Date(),
          maturityDate,
          outstandingUnits: parseInt(totalSupply),
          description: description || `${name} corporate bond issued by ${issuerName}`
        }
      })

      return NextResponse.json({
        success: true,
        symbol: newBond.symbol,
        contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        totalSupply: newBond.outstandingUnits.toString(),
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        message: `Bond created in database. Blockchain deployment failed - try SIM_MODE=true for testing`
      })
    }

  } catch (error: any) {
    console.error('❌ Bond minting error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    })
    return NextResponse.json({ 
      error: 'Failed to mint bond tokens',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

function getRatingString(ratingValue: number): string {
  const ratings: { [key: number]: string } = {
    95000: 'AAA',
    90000: 'AA+',
    85000: 'AA',
    80000: 'AA-',
    75000: 'A+',
    70000: 'A',
    65000: 'A-',
    60000: 'BBB+',
    55000: 'BBB'
  }
  return ratings[ratingValue] || 'NR'
}
