import { GoogleGenerativeAI } from '@google/generative-ai'

// Lazy, safe initialization so missing GEMINI_API_KEY doesn't break build/runtime
let genAI: GoogleGenerativeAI | null = null

function ensureGenAI(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  if (!genAI) {
    try {
      genAI = new GoogleGenerativeAI(key)
    } catch (e) {
      console.error('Gemini init failed:', e)
      genAI = null
    }
  }
  return genAI
}

export interface BondMarketData {
  symbol: string
  currentPrice: number
  yield: number
  spread: number
  rating: string
  maturityDate: string
  recommendedAction: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  marketSentiment: string
}

export interface RealTimeFinancialData {
  gSecYield10Y: number
  gSecYield5Y: number
  nifty: number
  sensex: number
  rupeeUSD: number
  inflationRate: number
  repoRate: number
}

export class GeminiFinancialService {
  private model: any

  constructor() {
    const sdk = ensureGenAI()
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    if (sdk) {
      try {
        this.model = sdk.getGenerativeModel({ model: modelName })
        if (process.env.NODE_ENV !== 'production') {
          console.info(`[Gemini] Using model: ${modelName}`)
        }
      } catch (e) {
        console.error('Failed to init Gemini model', modelName, e)
        // Fallback to a widely available model
        try {
          this.model = sdk.getGenerativeModel({ model: 'gemini-1.5-flash' })
          if (process.env.NODE_ENV !== 'production') {
            console.info('[Gemini] Fallback model: gemini-1.5-flash')
          }
        } catch {}
      }
    } else {
      this.model = null
    }
  }

  async getRealTimeMarketData(): Promise<RealTimeFinancialData> {
    const prompt = `
    Provide current Indian financial market data in JSON format:
    - 10-year G-Sec yield (%)
    - 5-year G-Sec yield (%)
    - Nifty 50 index
    - Sensex index  
    - USD/INR exchange rate
    - Current inflation rate (%)
    - RBI repo rate (%)
    
    Return ONLY valid JSON with realistic current values for Indian markets.
    `

    // If model unavailable (no API key), return fallback immediately
    if (!this.model) {
      return {
        gSecYield10Y: 7.15,
        gSecYield5Y: 6.95,
        nifty: 19800,
        sensex: 66500,
        rupeeUSD: 83.25,
        inflationRate: 5.85,
        repoRate: 6.50
      }
    }

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // Fallback data if parsing fails
      return {
        gSecYield10Y: 7.15,
        gSecYield5Y: 6.95,
        nifty: 19800,
        sensex: 66500,
        rupeeUSD: 83.25,
        inflationRate: 5.85,
        repoRate: 6.50
      }
    } catch (error) {
      console.error('Gemini API error:', error)
      
      // Return realistic fallback data
      return {
        gSecYield10Y: 7.15,
        gSecYield5Y: 6.95,
        nifty: 19800,
        sensex: 66500,
        rupeeUSD: 83.25,
        inflationRate: 5.85,
        repoRate: 6.50
      }
    }
  }

  async getBondPriceGuidance(
    bondSymbol: string,
    couponRate: number,
    rating: string,
    maturityYears: number,
    currentMarketData: RealTimeFinancialData
  ): Promise<BondMarketData> {
    const prompt = `
    As a bond pricing expert, analyze this Indian corporate bond:
    
    Bond Details:
    - Symbol: ${bondSymbol}
    - Coupon Rate: ${couponRate}%
    - Credit Rating: ${rating}
    - Years to Maturity: ${maturityYears}
    
    Market Context:
    - 10Y G-Sec Yield: ${currentMarketData.gSecYield10Y}%
    - 5Y G-Sec Yield: ${currentMarketData.gSecYield5Y}%
    - Repo Rate: ${currentMarketData.repoRate}%
    - Inflation: ${currentMarketData.inflationRate}%
    - Nifty: ${currentMarketData.nifty}
    
    Calculate fair value price (₹ per token, face value ₹1000) and provide analysis.
    Consider credit spread based on rating, yield curve, and market conditions.
    
    Return ONLY valid JSON with these fields:
    {
      "symbol": "${bondSymbol}",
      "currentPrice": number, 
      "yield": number,
      "spread": number,
      "rating": "${rating}",
      "maturityDate": "YYYY-MM-DD",
      "recommendedAction": "BUY|SELL|HOLD",
      "confidence": number (0-1),
      "marketSentiment": "string description"
    }
    `

    if (!this.model) {
      // Fallback calculation when API is unavailable
      return this.calculateFallbackPrice(bondSymbol, couponRate, rating, maturityYears, currentMarketData)
    }

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const guidance = JSON.parse(jsonMatch[0])
        return guidance
      }
      
      // Fallback calculation
      return this.calculateFallbackPrice(bondSymbol, couponRate, rating, maturityYears, currentMarketData)
    } catch (error) {
      console.error('Gemini price guidance error:', error)
      return this.calculateFallbackPrice(bondSymbol, couponRate, rating, maturityYears, currentMarketData)
    }
  }

  private calculateFallbackPrice(
    symbol: string,
    couponRate: number,
    rating: string,
    maturityYears: number,
    marketData: RealTimeFinancialData
  ): BondMarketData {
    // Simple bond pricing model
    const ratingSpread = this.getRatingSpread(rating)
    const baseYield = maturityYears <= 5 ? marketData.gSecYield5Y : marketData.gSecYield10Y
    const requiredYield = baseYield + ratingSpread
    
    // PV calculation for bond price
    const annualCoupon = couponRate * 10 // ₹ per year for ₹1000 face value
    const discountRate = requiredYield / 100
    
    let pv = 0
    for (let year = 1; year <= maturityYears; year++) {
      const payment = year === maturityYears ? annualCoupon + 1000 : annualCoupon
      pv += payment / Math.pow(1 + discountRate, year)
    }
    
    const currentPrice = Math.round(pv * 100) / 100
    
    return {
      symbol,
      currentPrice,
      yield: requiredYield,
      spread: ratingSpread * 100, // basis points
      rating,
      maturityDate: new Date(Date.now() + maturityYears * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      recommendedAction: currentPrice > 1000 ? 'SELL' : currentPrice < 950 ? 'BUY' : 'HOLD',
      confidence: 0.75,
      marketSentiment: currentPrice > 1000 ? 'Overvalued relative to risk' : 'Fairly valued given credit profile'
    }
  }

  private getRatingSpread(rating: string): number {
    const spreads: { [key: string]: number } = {
      'AAA': 0.50,
      'AA+': 0.75,
      'AA': 1.00,
      'AA-': 1.25,
      'A+': 1.50,
      'A': 1.75,
      'A-': 2.00,
      'BBB+': 2.50,
      'BBB': 3.00,
      'BBB-': 3.50,
    }
    return spreads[rating] || 2.00 // Default spread
  }

  async getMarketNews(): Promise<string[]> {
    const prompt = `
    Provide 3-5 current Indian bond market news headlines that would affect corporate bond trading.
    Focus on interest rates, RBI policy, corporate credit, and market conditions.
    Return as JSON array of strings.
    `

    if (!this.model) {
      return [
        "RBI maintains repo rate at 6.5% in latest policy review",
        "Corporate bond issuances up 15% QoQ amid strong demand",
        "G-Sec yields stable ahead of inflation data release"
      ]
    }

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      return [
        "RBI maintains repo rate at 6.5% in latest policy review",
        "Corporate bond issuances up 15% QoQ amid strong demand",
        "G-Sec yields stable ahead of inflation data release"
      ]
    } catch (error) {
      console.error('Gemini news error:', error)
      return [
        "RBI maintains repo rate at 6.5% in latest policy review",
        "Corporate bond issuances up 15% QoQ amid strong demand", 
        "G-Sec yields stable ahead of inflation data release"
      ]
    }
  }

  // General purpose assistant for Q&A and explanations
  async askAssistant(question: string, context?: string): Promise<string> {
    const systemPreamble = `You are BondBazaar's AI assistant for the SEBI hackathon. 
Provide clear, compliant, and India-focused answers about corporate bonds, pricing, risks, settlements, KYC, and how to use the BondBazaar app. 
Do NOT provide financial advice; instead give educational insights and always include a short disclaimer when giving opinions. 
Prefer concise bullet points and numbers. Use INR (₹) and Indian market terms.`

    const fullPrompt = [
      systemPreamble,
      context ? `Context:\n${context}` : undefined,
      `Question:\n${question}`,
      `Answer: (keep it concise and helpful)`
    ].filter(Boolean).join('\n\n')

    if (!this.model) {
      // Helpful fallback without external API
      return [
        'AI is running in fallback mode (no API key). Here are general tips:',
        '- Corporate bonds are debt issued by companies; returns come via coupons and principal at maturity.',
        '- Price guidance weighs G-Sec yields + rating spread + time to maturity.',
        '- In this prototype, trades can be simulated; on-chain settlement uses Sepolia in production.',
        '',
        'Disclaimer: This is educational, not investment advice.'
      ].join('\n')
    }

    try {
      const result = await this.model.generateContent(fullPrompt)
      const response = await result.response
      const text = response.text()
      return text.trim()
    } catch (error) {
      console.error('Gemini assistant error:', error)
      return 'Sorry, I could not process that right now. Please try again in a moment.'
    }
  }
}

export const geminiService = new GeminiFinancialService()
