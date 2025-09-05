'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { Lightbulb } from 'lucide-react'
import Markdown from '@/components/Markdown'

interface BondDetail {
  bond: {
    id: string
    symbol: string
    name: string
    pseudoISIN: string
    couponPct: number
    rating: string
    faceValue: number
    maturityDate: string
    description: string
  }
  lastPrice?: number
  bestBid?: number
  bestAsk?: number
  orderBook: {
    bids: Array<{ price: number; qty: number }>
    asks: Array<{ price: number; qty: number }>
  }
  recentTrades: Array<{
    id: string
    price: number
    qty: number
    timestamp: string
  }>
}

interface PriceGuidance {
  fairPrice: number
  fairYield: number
  benchmarkYield: number
  ratingSpread: number
  yearsToMaturity: number
  aiInsights?: string
}

export default function BondDetailPage() {
  const params = useParams()
  const bondId = params.id as string

  const [bondDetail, setBondDetail] = useState<BondDetail | null>(null)
  const [guidance, setGuidance] = useState<PriceGuidance | null>(null)
  const [aiSource, setAiSource] = useState<string | null>(null)
  const [marketNews, setMarketNews] = useState<string[]>([])
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [aiInsightLoading, setAiInsightLoading] = useState(false)
  const [showAIInsights, setShowAIInsights] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userLoading, setUserLoading] = useState(true)

  // Order form state
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('')
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')

  useEffect(() => {
    fetchUser()
    fetchBondDetail()
    fetchGuidance()
  }, [bondId])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setUserLoading(false)
    }
  }

  const fetchBondDetail = async () => {
    try {
      const response = await fetch(`/api/bonds/${bondId}`)
      if (response.ok) {
        const data = await response.json()
        setBondDetail(data)
      }
    } catch (error) {
      console.error('Failed to fetch bond detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGuidance = async () => {
    try {
      const response = await fetch(`/api/guidance/${bondId}`)
      if (response.ok) {
        const data = await response.json()
        // API returns { guidance, marketNews, source, timestamp }
        setGuidance(data.guidance)
        setAiSource(data.source || null)
        setMarketNews(Array.isArray(data.marketNews) ? data.marketNews : [])
      }
    } catch (error) {
      console.error('Failed to fetch guidance:', error)
    }
  }

  const fetchBondAIInsight = async () => {
    if (!bondDetail) return
    setAiInsightLoading(true)
    try {
      const message = `Provide an educational, concise analysis for this Indian corporate bond for a retail investor. Avoid investment advice.
Symbol: ${bondDetail.bond.symbol}
Name: ${bondDetail.bond.name}
Rating: ${bondDetail.bond.rating}
Coupon: ${bondDetail.bond.couponPct}%
Maturity: ${formatDate(bondDetail.bond.maturityDate)}
Last Price: ${bondDetail.lastPrice ?? 'N/A'}
Best Bid/Ask: ${bondDetail.bestBid ?? '-'} / ${bondDetail.bestAsk ?? '-'}
Include: key risks, what moves its price, and a one-liner educational takeaway.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      if (res.ok) {
        const data = await res.json()
        setAiInsight(data.reply as string)
      } else {
        setAiInsight('AI insight is currently unavailable. Please try again later.')
      }
    } catch (e) {
      setAiInsight('Network error. Please try again later.')
    } finally {
      setAiInsightLoading(false)
    }
  }

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setOrderLoading(true)
    setOrderMessage('')

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bondId,
          side,
          price: parseFloat(price),
          qty: parseInt(qty)
        })
      })

      const data = await response.json()

      if (response.ok) {
        setOrderMessage(`Order placed successfully! ${data.trades?.length || 0} trades executed.`)
        setPrice('')
        setQty('')
        // Refresh bond detail to show updated order book
        fetchBondDetail()
      } else {
        setOrderMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setOrderMessage('Network error. Please try again.')
    } finally {
      setOrderLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN')
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'AAA': return 'bg-green-100 text-green-800'
      case 'AA': return 'bg-blue-100 text-blue-800'
      case 'A': return 'bg-yellow-100 text-yellow-800'
      case 'BBB': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCoachHints = (): string[] => {
    const hints: string[] = []
    const p = parseFloat(price)
    if (!isFinite(p)) return hints
    if (guidance?.fairPrice) {
      const diffPct = ((p - guidance.fairPrice) / guidance.fairPrice) * 100
      const diffAbs = Math.round((p - guidance.fairPrice) * 100) / 100
      const dir = diffPct === 0 ? 'at' : diffPct > 0 ? 'above' : 'below'
      hints.push(`Price is ${Math.abs(diffPct).toFixed(1)}% (${diffAbs >= 0 ? '₹' + diffAbs : '-₹' + Math.abs(diffAbs)}) ${dir} AI fair value`)
    }
    const bid = bondDetail?.bestBid
    const ask = bondDetail?.bestAsk
    if (side === 'BUY') {
      if (ask) {
        if (p >= ask) hints.push('Likely immediate execution (crossing best ask)')
        else hints.push('Below best ask; order will queue at bid side')
      }
      if (bid) {
        if (p > bid) hints.push('Improves best bid and increases priority')
        else if (p === bid) hints.push('Matches best bid; fills if sellers hit')
      }
    } else {
      if (bid) {
        if (p <= bid) hints.push('Likely immediate execution (crossing best bid)')
        else hints.push('Above best bid; order will queue at ask side')
      }
      if (ask) {
        if (p < ask) hints.push('Improves best ask and increases priority')
        else if (p === ask) hints.push('Matches best ask; fills if buyers lift')
      }
    }
    return hints
  }

  if (loading) {
    return <div className="text-center py-12">Loading bond details...</div>
  }

  if (!bondDetail) {
    return <div className="text-center py-12">Bond not found</div>
  }

  if (userLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-56 rounded bg-muted animate-pulse" />
            <div className="mt-2 h-4 w-64 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-64 rounded bg-muted animate-pulse" />
          <div className="h-64 rounded bg-muted animate-pulse" />
          <div className="h-64 rounded bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="mb-4">Please log in to trade bonds</p>
        <Link href="/login">
          <Button>Login</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{bondDetail.bond.symbol}</h2>
          <p className="text-gray-600">{bondDetail.bond.name}</p>
        </div>
        <Link href="/">
          <Button variant="outline">← Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bond Info */}
        <Card>
          <CardHeader>
            <CardTitle>Bond Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">ISIN</span>
                <div className="font-semibold">{bondDetail.bond.pseudoISIN}</div>
              </div>
              <div>
                <span className="text-gray-500">Rating</span>
                <div>
                  <Badge className={getRatingColor(bondDetail.bond.rating)}>
                    {bondDetail.bond.rating}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Coupon</span>
                <div className="font-semibold">{bondDetail.bond.couponPct}%</div>
              </div>
              <div>
                <span className="text-gray-500">Face Value</span>
                <div className="font-semibold">₹{bondDetail.bond.faceValue}</div>
              </div>
              <div>
                <span className="text-gray-500">Maturity</span>
                <div className="font-semibold">{formatDate(bondDetail.bond.maturityDate)}</div>
              </div>
              <div>
                <span className="text-gray-500">Last Price</span>
                <div className="font-semibold">
                  {bondDetail.lastPrice ? `₹${bondDetail.lastPrice}` : 'N/A'}
                </div>
              </div>
            </div>
            
            {guidance && (
              <div className="pt-4 border-t animate-in fade-in-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-500">Price Guidance</div>
                  {aiSource && (
                    <span className={`text-[10px] px-2 py-1 rounded-full border ${aiSource === 'AI-Enhanced' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {aiSource}
                    </span>
                  )}
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-semibold text-blue-900">
                    Fair Price: ₹{guidance.fairPrice}
                  </div>
                  <div className="text-sm text-blue-700">
                    Fair Yield: {guidance.fairYield}% 
                    (G-Sec: {guidance.benchmarkYield}% + Spread: {guidance.ratingSpread}%)
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    TTM: {guidance.yearsToMaturity} years
                  </div>
                </div>
                {marketNews && marketNews.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-1">Market News</div>
                    <ul className="text-xs list-disc pl-4 space-y-1">
                      {marketNews.slice(0,3).map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiSource === 'AI-Enhanced' && guidance.aiInsights && (
                  <div className="mt-3">
                    <Button size="sm" variant="ghost" onClick={() => setShowAIInsights((s) => !s)}>
                      {showAIInsights ? 'Hide' : 'Show'} AI Insights
                    </Button>
                    {showAIInsights && (
                      <div className="mt-2 text-xs p-2 rounded border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <Markdown text={guidance.aiInsights} />
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={fetchBondAIInsight} disabled={aiInsightLoading}>
                    {aiInsightLoading ? 'Analyzing…' : 'Get AI Insight'}
                  </Button>
                  {aiInsight && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted-foreground">Educational AI Insight</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(aiInsight)
                              setCopied(true)
                              setTimeout(() => setCopied(false), 1200)
                            } catch {}
                          }}
                        >
                          {copied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                      <div className="text-xs p-2 rounded border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <Markdown text={aiInsight} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              {bondDetail.bond.description}
            </div>
          </CardContent>
        </Card>

        {/* Order Form */}
        <Card>
          <CardHeader>
            <CardTitle>Place Order</CardTitle>
            <CardDescription>1 token = ₹{bondDetail.bond.faceValue} face value</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Side</Label>
                <Select value={side} onValueChange={(value: 'BUY' | 'SELL') => setSide(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price per Token (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="1000.00"
                  required
                />
                <div className="flex flex-wrap gap-2 text-xs">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => guidance && setPrice(String(guidance.fairPrice))}
                    disabled={!guidance}
                  >
                    Use Fair Price {guidance ? `₹${guidance.fairPrice}` : ''}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bondDetail.bestBid && setPrice(String(bondDetail.bestBid))}
                    disabled={!bondDetail.bestBid}
                  >
                    Use Best Bid {bondDetail.bestBid ? `₹${bondDetail.bestBid}` : ''}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bondDetail.bestAsk && setPrice(String(bondDetail.bestAsk))}
                    disabled={!bondDetail.bestAsk}
                  >
                    Use Best Ask {bondDetail.bestAsk ? `₹${bondDetail.bestAsk}` : ''}
                  </Button>
                </div>
                {price && (
                  <div className="mt-2 text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 p-2 rounded animate-in fade-in-50">
                    <div className="flex items-center gap-2 font-medium">
                      <Lightbulb className="h-3.5 w-3.5" /> Trading coach
                    </div>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      {getCoachHints().map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity (Tokens)</Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>
              {price && qty && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  Total Value: ₹{(parseFloat(price) * parseInt(qty) || 0).toLocaleString()}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={orderLoading}>
                {orderLoading ? 'Placing Order...' : `Place ${side} Order`}
              </Button>
            </form>
            {orderMessage && (
              <div className={`mt-4 text-sm p-3 rounded ${
                orderMessage.includes('Error') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'
              }`}>
                {orderMessage}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Data */}
        <Card>
          <CardHeader>
            <CardTitle>Market Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Best Bid</span>
                <div className="text-lg font-semibold text-green-600">
                  {bondDetail.bestBid ? `₹${bondDetail.bestBid}` : '-'}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Best Ask</span>
                <div className="text-lg font-semibold text-red-600">
                  {bondDetail.bestAsk ? `₹${bondDetail.bestAsk}` : '-'}
                </div>
              </div>
            </div>

            {/* Order Book */}
            <div>
              <h4 className="font-semibold mb-2">Order Book</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-semibold text-green-600 mb-1">BIDS</div>
                  {bondDetail.orderBook.bids.map((bid, i) => (
                    <div key={i} className="flex justify-between">
                      <span>₹{bid.price}</span>
                      <span>{bid.qty}</span>
                    </div>
                  ))}
                  {bondDetail.orderBook.bids.length === 0 && (
                    <div className="text-gray-400">No bids</div>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-red-600 mb-1">ASKS</div>
                  {bondDetail.orderBook.asks.map((ask, i) => (
                    <div key={i} className="flex justify-between">
                      <span>₹{ask.price}</span>
                      <span>{ask.qty}</span>
                    </div>
                  ))}
                  {bondDetail.orderBook.asks.length === 0 && (
                    <div className="text-gray-400">No asks</div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            <div>
              <h4 className="font-semibold mb-2">Recent Trades</h4>
              <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                {bondDetail.recentTrades.map((trade) => (
                  <div key={trade.id} className="flex justify-between items-center">
                    <span className="font-semibold">₹{trade.price}</span>
                    <span>{trade.qty}</span>
                    <span className="text-gray-500">{formatTime(trade.timestamp)}</span>
                  </div>
                ))}
                {bondDetail.recentTrades.length === 0 && (
                  <div className="text-gray-400">No recent trades</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
