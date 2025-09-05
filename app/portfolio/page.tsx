'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import Markdown from '@/components/Markdown'

interface PortfolioBalance {
  bondId: string
  bond: {
    id: string
    symbol: string
    name: string
    couponPct: number
    rating: string
    faceValue: number
    maturityDate: string
  }
  tokenQty: number
  faceValue: number
}

interface PortfolioTrade {
  id: string
  bondSymbol: string
  bondName: string
  price: number
  qty: number
  timestamp: string
  side: 'BUY' | 'SELL'
  txHash?: string
}

interface PortfolioOrder {
  id: string
  bondSymbol: string
  bondName: string
  side: 'BUY' | 'SELL'
  price: number
  qty: number
  qtyFilled: number
  status: string
  createdAt: string
}

interface Portfolio {
  balances: PortfolioBalance[]
  trades: PortfolioTrade[]
  openOrders: PortfolioOrder[]
  portfolioValue: number
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    fetchUser()
    fetchPortfolio()
  }, [])

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

  const fetchPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio')
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST'
      })
      if (response.ok) {
        fetchPortfolio() // Refresh data
      }
    } catch (error) {
      console.error('Failed to cancel order:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN')
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

  const generateAISummary = async () => {
    if (!portfolio || !user) return
    setAiLoading(true)
    try {
      const contextParts: string[] = []
      if (portfolio.balances?.length) {
        contextParts.push('Holdings:')
        contextParts.push(
          portfolio.balances
            .map((b) => `${b.bond.symbol} (${b.bond.rating}) - ${b.tokenQty} tokens, coupon ${b.bond.couponPct}%`)
            .join('\n')
        )
      }
      if (portfolio.openOrders?.length) {
        contextParts.push('\nOpen Orders:')
        contextParts.push(
          portfolio.openOrders
            .map((o) => `${o.side} ${o.bondSymbol} @ ₹${o.price} x ${o.qty} (${o.status})`)
            .join('\n')
        )
      }
      if (portfolio.trades?.length) {
        contextParts.push('\nRecent Trades:')
        contextParts.push(
          portfolio.trades
            .slice(0, 5)
            .map((t) => `${t.side} ${t.bondSymbol} @ ₹${t.price} x ${t.qty}`)
            .join('\n')
        )
      }

      const message = `Create an educational, concise portfolio briefing for an Indian retail investor. Avoid investment advice.
User: ${user.displayName}
Total Portfolio Value: ₹${portfolio.portfolioValue.toLocaleString()}
${contextParts.join('\n')}

Include: allocation by rating, coupon/yield context, concentration risks, and 2-3 watchpoints.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      if (res.ok) {
        const data = await res.json()
        setAiSummary(data.reply as string)
      } else {
        setAiSummary('AI summary unavailable at the moment. Please try again later.')
      }
    } catch (e) {
      setAiSummary('Network error. Please try again later.')
    } finally {
      setAiLoading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-40 rounded bg-muted animate-pulse" />
            <div className="mt-2 h-4 w-64 rounded bg-muted animate-pulse" />
          </div>
          <div className="text-right">
            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="mb-4">Please log in to view your portfolio</p>
        <Link href="/login">
          <Button>Login</Button>
        </Link>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-12">Loading portfolio...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Portfolio</h2>
          <p className="text-gray-600">
            {user.displayName}
            {user.kycVerified && (
              <Badge className="ml-2 bg-green-100 text-green-800">KYC Verified</Badge>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Portfolio Value</div>
          <div className="text-2xl font-bold">₹{portfolio?.portfolioValue.toLocaleString()}</div>
        </div>
      </div>

      {/* AI Summary */}
      <Card>
        <CardHeader>
          <CardTitle>AI Summary</CardTitle>
          <CardDescription>Educational portfolio briefing (Gemini-powered)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-2">
            <div className="text-[10px] text-muted-foreground">Disclaimer: Educational only, not investment advice.</div>
            <Button size="sm" variant="outline" onClick={generateAISummary} disabled={aiLoading || !portfolio || !user}>
              {aiLoading ? 'Generating…' : 'Generate Summary'}
            </Button>
          </div>
          {aiSummary ? (
            <div className="p-3 rounded border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <Markdown text={aiSummary} />
            </div>
          ) : (
            <div className="text-sm text-slate-700 dark:text-slate-300">Click "Generate Summary" to get an overview of your holdings and risks.</div>
          )}
        </CardContent>
      </Card>

      {/* Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <CardDescription>Your current bond token positions</CardDescription>
        </CardHeader>
        <CardContent>
          {portfolio?.balances && portfolio.balances.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bond</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Coupon</TableHead>
                  <TableHead>Maturity</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Face Value</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolio.balances.map((balance) => (
                  <TableRow key={balance.bondId}>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{balance.bond.symbol}</div>
                        <div className="text-sm text-gray-500">{balance.bond.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRatingColor(balance.bond.rating)}>
                        {balance.bond.rating}
                      </Badge>
                    </TableCell>
                    <TableCell>{balance.bond.couponPct}%</TableCell>
                    <TableCell>{formatDate(balance.bond.maturityDate)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {balance.tokenQty}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{balance.faceValue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/bonds/${balance.bondId}`}>
                        <Button size="sm" variant="outline">Trade</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No holdings yet. Start trading to build your portfolio.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Open Orders</CardTitle>
          <CardDescription>Your active buy and sell orders</CardDescription>
        </CardHeader>
        <CardContent>
          {portfolio?.openOrders && portfolio.openOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bond</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Filled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolio.openOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{order.bondSymbol}</div>
                        <div className="text-sm text-gray-500">{order.bondName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.side === 'BUY' ? 'default' : 'destructive'}>
                        {order.side}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{order.price}</TableCell>
                    <TableCell>{order.qty}</TableCell>
                    <TableCell>{order.qtyFilled}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => cancelOrder(order.id)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No open orders
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>Your recent trading activity</CardDescription>
        </CardHeader>
        <CardContent>
          {portfolio?.trades && portfolio.trades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bond</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Tx Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolio.trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{trade.bondSymbol}</div>
                        <div className="text-sm text-gray-500">{trade.bondName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'}>
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{trade.price}</TableCell>
                    <TableCell>{trade.qty}</TableCell>
                    <TableCell>₹{(trade.price * trade.qty).toLocaleString()}</TableCell>
                    <TableCell>{formatDateTime(trade.timestamp)}</TableCell>
                    <TableCell>
                      {trade.txHash ? (
                        <code className="text-xs bg-gray-100 px-1 rounded">
                          {trade.txHash.substring(0, 8)}...
                        </code>
                      ) : (
                        <Badge variant="outline">SIM</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No trades yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
