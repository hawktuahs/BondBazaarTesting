'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import MarketInsights from '@/components/MarketInsights'
import Skeleton from '@/components/ui/skeleton'

interface Bond {
  id: string
  symbol: string
  name: string
  couponPct: number
  rating: string
  maturityDate: string
  lastPrice?: number
  bestBid?: number
  bestAsk?: number
  volume24h: number
}

export default function Dashboard() {
  const [bonds, setBonds] = useState<Bond[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [user, setUser] = useState<any>(null)
  const [userLoading, setUserLoading] = useState(true)

  useEffect(() => {
    fetchUser()
    fetchBonds()
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

  const fetchBonds = async () => {
    try {
      const response = await fetch('/api/bonds')
      if (response.ok) {
        const data = await response.json()
        setBonds(data)
      }
    } catch (error) {
      console.error('Failed to fetch bonds:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBonds = bonds.filter(bond =>
    bond.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bond.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
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

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <MarketInsights />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to BondBazaar</CardTitle>
            <CardDescription>
              Please log in to access the corporate bond trading platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/login">
              <Button className="w-full">Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full">Register</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Corporate Bonds</h2>
          <p className="text-gray-600">
            Welcome back, {user.displayName}
            {user.kycVerified && (
              <Badge className="ml-2 bg-green-100 text-green-800">KYC Verified</Badge>
            )}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/wallet">
            <Button variant="outline" size="sm">Wallet</Button>
          </Link>
          <Link href="/portfolio">
            <Button variant="outline" size="sm">Portfolio</Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="sm">Settings</Button>
          </Link>
        </div>
      </div>

      {/* AI Market Insights */}
      <MarketInsights />

      {/* Search */}
      <div className="flex space-x-4">
        <Input
          placeholder="Search bonds by symbol or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Bonds Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j}>
                      <Skeleton className="h-3 w-16 mb-2" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
                <Skeleton className="mt-4 h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBonds.map((bond) => (
            <Card key={bond.id} className="hover:shadow-lg transition-all hover:-translate-y-0.5">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{bond.symbol}</CardTitle>
                    <CardDescription>{bond.name}</CardDescription>
                  </div>
                  <Badge className={getRatingColor(bond.rating)}>
                    {bond.rating}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Coupon</span>
                    <div className="font-semibold">{bond.couponPct}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Maturity</span>
                    <div className="font-semibold">{formatDate(bond.maturityDate)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Price</span>
                    <div className="font-semibold">
                      {bond.lastPrice ? `₹${bond.lastPrice}` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">24h Volume</span>
                    <div className="font-semibold">{bond.volume24h}</div>
                  </div>
                </div>

                {(bond.bestBid || bond.bestAsk) && (
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-500">Bid: </span>
                      <span className="font-semibold text-green-600">
                        {bond.bestBid ? `₹${bond.bestBid}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ask: </span>
                      <span className="font-semibold text-red-600">
                        {bond.bestAsk ? `₹${bond.bestAsk}` : '-'}
                      </span>
                    </div>
                  </div>
                )}

                <Link href={`/bonds/${bond.id}`}>
                  <Button className="w-full">Trade</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredBonds.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No bonds found matching your search.</p>
        </div>
      )}
    </div>
  )
}
