import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { geminiService } = await import('@/lib/gemini')

    const body = await request.json().catch(() => null)
    const message: string | undefined = body?.message
    const context: string | undefined = body?.context

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing "message" in request body' }, { status: 400 })
    }

    const reply = await geminiService.askAssistant(message, context)

    return NextResponse.json({ reply, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('AI Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
