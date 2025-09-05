import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getEnhancedPriceGuidance, getPriceGuidance } from '@/lib/guidance'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bondId = params.id

    // Get bond details
    const bond = await prisma.bond.findUnique({
      where: { id: bondId }
    })

    if (!bond) {
      return NextResponse.json({ error: 'Bond not found' }, { status: 404 })
    }

    // Try enhanced AI-powered guidance first
    let guidance
    try {
      guidance = await getEnhancedPriceGuidance(
        bond.symbol,
        bond.couponPct,
        bond.rating,
        bond.maturityDate,
        bond.faceValue
      )
    } catch (error) {
      console.log('AI guidance failed, using fallback:', error)
      // Fallback to traditional guidance
      guidance = getPriceGuidance(
        bond.couponPct,
        bond.rating,
        bond.maturityDate,
        bond.faceValue
      )
    }

    // Add market news if AI is available
    let marketNews: string[] = []
    try {
      const { geminiService } = await import('@/lib/gemini')
      marketNews = await geminiService.getMarketNews()
    } catch (error) {
      console.log('Market news unavailable:', error)
    }

    return NextResponse.json({ 
      guidance,
      marketNews,
      timestamp: new Date().toISOString(),
      source: guidance.marketData ? 'AI-Enhanced' : 'Traditional'
    })
  } catch (error) {
    console.error('Price guidance API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
