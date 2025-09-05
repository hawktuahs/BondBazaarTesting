import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { geminiService } = await import('@/lib/gemini')

    const [marketData, marketNews] = await Promise.all([
      geminiService.getRealTimeMarketData(),
      geminiService.getMarketNews()
    ])

    return NextResponse.json({ marketData, marketNews, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('AI Insights API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
