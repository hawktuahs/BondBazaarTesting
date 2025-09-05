'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import UPIPayment from '@/components/UPIPayment'
import Link from 'next/link'

export default function WalletPage() {
  const [user, setUser] = useState<any>(null)
  const [balances, setBalances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [fundAmount, setFundAmount] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const userResponse = await fetch('/api/auth/me')
      if (!userResponse.ok) {
        router.push('/login')
        return
      }
      const userData = await userResponse.json()
      setUser(userData.user)

      const portfolioResponse = await fetch('/api/portfolio')
      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json()
        setBalances(portfolioData.balances)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFunds = () => {
    const amount = parseFloat(fundAmount)
    if (isNaN(amount) || amount < 1000) {
      alert('Minimum funding amount is ₹1,000')
      return
    }
    setShowPayment(true)
  }

  const handlePaymentSuccess = async () => {
    // In a real app, this would be triggered by payment gateway webhook
    // For demo, we'll simulate adding funds to the user's cash balance
    try {
      const amount = parseFloat(fundAmount)
      const response = await fetch('/api/wallet/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      })
      
      if (response.ok) {
        setShowPayment(false)
        setFundAmount('')
        fetchData() // Refresh balances
        alert(`Successfully added ₹${amount.toLocaleString('en-IN')} to your wallet!`)
      }
    } catch (error) {
      console.error('Failed to add funds:', error)
    }
  }

  const handlePaymentCancel = () => {
    setShowPayment(false)
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!user) {
    return null
  }

  const cashBalance = balances.find(b => b.bondId === 'CASH')?.qty || 0

  if (showPayment) {
    return (
      <div className="max-w-2xl mx-auto">
        <UPIPayment
          amount={parseFloat(fundAmount)}
          purpose="Add funds to BondBazaar wallet"
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Wallet</h2>
          <p className="text-gray-600">Manage your funds and view balances</p>
        </div>
        <Link href="/">
          <Button variant="outline">← Back to Dashboard</Button>
        </Link>
      </div>

      {/* Cash Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Balance</CardTitle>
          <CardDescription>Available funds for trading</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600 mb-4">
            ₹{cashBalance.toLocaleString('en-IN')}
          </div>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="fund-amount">Add Funds (₹)</Label>
              <Input
                id="fund-amount"
                type="number"
                placeholder="10000"
                min="1000"
                step="1000"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
              />
              <div className="text-xs text-gray-500 mt-1">
                Minimum: ₹1,000
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddFunds} disabled={!fundAmount}>
                Add Funds via UPI
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bond Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Bond Holdings</CardTitle>
          <CardDescription>Your tokenized bond positions</CardDescription>
        </CardHeader>
        <CardContent>
          {balances.filter(b => b.bondId !== 'CASH').length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📊</div>
              <p>No bond holdings yet</p>
              <p className="text-sm">Start trading to build your portfolio</p>
              <Link href="/">
                <Button className="mt-4">Browse Bonds</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {balances.filter(b => b.bondId !== 'CASH').map((balance) => (
                <div key={balance.bondId} className="flex justify-between items-center p-4 border rounded">
                  <div>
                    <div className="font-semibold">{balance.bond?.name || balance.bondId}</div>
                    <div className="text-sm text-gray-500">
                      {balance.bond?.issuer} • {balance.bond?.rating}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{(balance.qty || 0).toLocaleString()} tokens</div>
                    <div className="text-sm text-gray-500">
                      ≈ ₹{((balance.qty || 0) * (balance.bond?.lastPrice || 100)).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Supported funding options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="text-2xl mb-2">📱</div>
              <div className="text-sm font-medium">UPI</div>
              <Badge className="mt-1 text-xs">Available</Badge>
            </div>
            <div className="text-center p-4 border rounded opacity-50">
              <div className="text-2xl mb-2">🏦</div>
              <div className="text-sm font-medium">Net Banking</div>
              <Badge variant="outline" className="mt-1 text-xs">Coming Soon</Badge>
            </div>
            <div className="text-center p-4 border rounded opacity-50">
              <div className="text-2xl mb-2">💳</div>
              <div className="text-sm font-medium">Debit Card</div>
              <Badge variant="outline" className="mt-1 text-xs">Coming Soon</Badge>
            </div>
            <div className="text-center p-4 border rounded opacity-50">
              <div className="text-2xl mb-2">💰</div>
              <div className="text-sm font-medium">NEFT/RTGS</div>
              <Badge variant="outline" className="mt-1 text-xs">Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your funding and withdrawal history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">📋</div>
            <p>No transactions yet</p>
            <p className="text-sm">Fund your wallet to start trading</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
