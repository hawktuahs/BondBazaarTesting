// Enhanced Price guidance system with Gemini AI integration
import { geminiService, type BondMarketData, type RealTimeFinancialData } from './gemini'

interface GSec {
  years: number
  yield: number
}

interface RatingSpread {
  [key: string]: number
}

// Fallback G-Sec benchmark curve
const GSEC_CURVE: GSec[] = [
  { years: 1, yield: 6.8 },
  { years: 3, yield: 7.0 },
  { years: 5, yield: 7.1 },
  { years: 7, yield: 7.2 },
  { years: 10, yield: 7.3 }
]

// Rating spreads over G-Sec (fallback)
const RATING_SPREADS: RatingSpread = {
  'AAA': 0.5,
  'AA+': 0.75,
  'AA': 1.0,
  'AA-': 1.25,
  'A+': 1.5,
  'A': 1.75,
  'A-': 2.0,
  'BBB+': 2.5,
  'BBB': 3.0,
  'BBB-': 3.5,
}

export function calculateYearsToMaturity(maturityDate: Date): number {
  const now = new Date()
  const diffTime = maturityDate.getTime() - now.getTime()
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25)
  return Math.max(0, diffYears)
}

export function interpolateGSecYield(yearsToMaturity: number): number {
  if (yearsToMaturity <= GSEC_CURVE[0].years) {
    return GSEC_CURVE[0].yield
  }
  
  if (yearsToMaturity >= GSEC_CURVE[GSEC_CURVE.length - 1].years) {
    return GSEC_CURVE[GSEC_CURVE.length - 1].yield
  }

  // Linear interpolation between two points
  for (let i = 0; i < GSEC_CURVE.length - 1; i++) {
    const current = GSEC_CURVE[i]
    const next = GSEC_CURVE[i + 1]
    
    if (yearsToMaturity >= current.years && yearsToMaturity <= next.years) {
      const ratio = (yearsToMaturity - current.years) / (next.years - current.years)
      return current.yield + ratio * (next.yield - current.yield)
    }
  }
  
  return GSEC_CURVE[0].yield // Fallback
}

export function calculateFairYield(
  couponPct: number,
  rating: string,
  maturityDate: Date
): number {
  const yearsToMaturity = calculateYearsToMaturity(maturityDate)
  const benchmarkYield = interpolateGSecYield(yearsToMaturity)
  const ratingSpread = RATING_SPREADS[rating] || 2.0 // Default spread for unknown ratings
  
  return benchmarkYield + ratingSpread
}

export function calculateFairPrice(
  couponPct: number,
  fairYield: number,
  yearsToMaturity: number,
  faceValue: number = 1000
): number {
  // Simplified clean price calculation
  // PV = (Coupon / Yield) * [1 - 1/(1+Yield)^n] + FaceValue/(1+Yield)^n
  
  const annualCoupon = (couponPct / 100) * faceValue
  const yieldDecimal = fairYield / 100
  
  if (yieldDecimal === 0) {
    return faceValue + (annualCoupon * yearsToMaturity)
  }
  
  const discountFactor = Math.pow(1 + yieldDecimal, -yearsToMaturity)
  const annuityFactor = (1 - discountFactor) / yieldDecimal
  
  const presentValue = (annualCoupon * annuityFactor) + (faceValue * discountFactor)
  
  return Math.round(presentValue * 100) / 100 // Round to 2 decimal places
}

export interface PriceGuidance {
  fairYield: number
  fairPrice: number
  benchmarkYield: number
  ratingSpread: number
  yearsToMaturity: number
  marketData?: RealTimeFinancialData
  bondAnalysis?: BondMarketData
  aiInsights?: string
  recommendation?: 'BUY' | 'SELL' | 'HOLD'
  confidence?: number
}

// Enhanced price guidance using Gemini AI
export async function getEnhancedPriceGuidance(
  symbol: string,
  couponPct: number,
  rating: string,
  maturityDate: Date,
  faceValue: number = 1000
): Promise<PriceGuidance> {
  try {
    const yearsToMaturity = calculateYearsToMaturity(maturityDate)
    
    // Get real-time market data and AI analysis
    const marketData = await geminiService.getRealTimeMarketData()
    const bondAnalysis = await geminiService.getBondPriceGuidance(
      symbol,
      couponPct,
      rating,
      yearsToMaturity,
      marketData
    )

    const benchmarkYield = yearsToMaturity <= 5 ? marketData.gSecYield5Y : marketData.gSecYield10Y
    
    return {
      fairYield: bondAnalysis.yield,
      fairPrice: bondAnalysis.currentPrice,
      benchmarkYield,
      ratingSpread: bondAnalysis.spread / 100, // Convert from basis points
      yearsToMaturity,
      marketData,
      bondAnalysis,
      aiInsights: bondAnalysis.marketSentiment,
      recommendation: bondAnalysis.recommendedAction,
      confidence: bondAnalysis.confidence
    }
  } catch (error) {
    console.error('Enhanced price guidance error:', error)
    // Fallback to traditional guidance
    return getPriceGuidance(couponPct, rating, maturityDate, faceValue)
  }
}

// Traditional price guidance (fallback)
export function getPriceGuidance(
  couponPct: number,
  rating: string,
  maturityDate: Date,
  faceValue: number = 1000
): PriceGuidance {
  const yearsToMaturity = calculateYearsToMaturity(maturityDate)
  const benchmarkYield = interpolateGSecYield(yearsToMaturity)
  const ratingSpread = RATING_SPREADS[rating] || 2.0
  const fairYield = benchmarkYield + ratingSpread
  const fairPrice = calculateFairPrice(couponPct, fairYield, yearsToMaturity, faceValue)
  
  return {
    fairYield: Math.round(fairYield * 100) / 100,
    fairPrice,
    benchmarkYield: Math.round(benchmarkYield * 100) / 100,
    ratingSpread,
    yearsToMaturity: Math.round(yearsToMaturity * 100) / 100,
    aiInsights: 'Traditional calculation (AI unavailable)',
    recommendation: fairPrice > faceValue ? 'SELL' : fairPrice < faceValue * 0.95 ? 'BUY' : 'HOLD',
    confidence: 0.6
  }
}
