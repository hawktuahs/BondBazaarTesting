"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Skeleton from '@/components/ui/skeleton'

interface MarketData {
  gSecYield10Y: number
  gSecYield5Y: number
  nifty: number
  sensex: number
  rupeeUSD: number
  inflationRate: number
  repoRate: number
}

export default function MarketInsights() {
  const [loading, setLoading] = useState(true)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [news, setNews] = useState<string[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchInsights = async () => {
    try {
      const res = await fetch('/api/ai/insights', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setMarketData(data.marketData)
        setNews(data.marketNews)
      }
    } catch (e) {
      // ignore, fallbacks exist server-side
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  const doRefresh = async () => {
    setRefreshing(true)
    await fetchInsights()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2 overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Market Snapshot</CardTitle>
            <CardDescription>AI-curated Indian market context</CardDescription>
          </div>
          <button
            onClick={doRefresh}
            disabled={refreshing}
            className="text-xs px-3 py-1.5 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </CardHeader>
        <CardContent>
          {loading || !marketData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in-50">
              <Metric label="10Y G-Sec" value={marketData?.gSecYield10Y ? `${marketData.gSecYield10Y}%` : 'N/A'} />
              <Metric label="5Y G-Sec" value={marketData?.gSecYield5Y ? `${marketData.gSecYield5Y}%` : 'N/A'} />
              <Metric label="Repo Rate" value={marketData?.repoRate ? `${marketData.repoRate}%` : 'N/A'} />
              <Metric label="Inflation" value={marketData?.inflationRate ? `${marketData.inflationRate}%` : 'N/A'} />
              <Metric label="Nifty 50" value={marketData?.nifty ? marketData.nifty.toLocaleString() : 'N/A'} />
              <Metric label="Sensex" value={marketData?.sensex ? marketData.sensex.toLocaleString() : 'N/A'} />
              <Metric label="USD/INR" value={marketData?.rupeeUSD ? marketData.rupeeUSD.toString() : 'N/A'} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market News</CardTitle>
          <CardDescription>Signals that may drive credit and yields</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          ) : news.length > 0 ? (
            <ul className="space-y-2 text-sm list-disc pl-5 text-slate-800 dark:text-slate-100">
              {news.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">No headlines available.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border bg-white/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all">
      <div className="text-[11px] text-slate-600 dark:text-slate-300">{label}</div>
      <div className="text-lg font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}
