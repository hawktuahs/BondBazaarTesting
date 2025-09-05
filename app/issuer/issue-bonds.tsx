'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Bond {
  id: string
  symbol: string
  name: string
  totalSupply: number
  issuerBalance: number
  currentlyForSale: number
  canIssueMore: boolean
  contractAddress: string
  sellOrders: Array<{
    id: string
    price: number
    quantity: number
    filled: number
    remaining: number
  }>
}

interface IssueBondsProps {
  bondId: string
}

export default function IssueBonds({ bondId }: IssueBondsProps) {
  const [bond, setBond] = useState<Bond | null>(null)
  const [issuePrice, setIssuePrice] = useState('')
  const [issueQuantity, setIssueQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchBondStatus()
  }, [bondId])

  const fetchBondStatus = async () => {
    try {
      const response = await fetch(`/api/bonds/${bondId}/issue`)
      if (response.ok) {
        const data = await response.json()
        setBond(data)
      } else {
        setError('Failed to fetch bond status')
      }
    } catch (err) {
      setError('Error fetching bond status')
    }
  }

  const handleIssueBonds = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/bonds/${bondId}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: parseFloat(issuePrice),
          quantity: parseInt(issueQuantity)
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setIssuePrice('')
        setIssueQuantity('')
        fetchBondStatus() // Refresh status
      } else {
        setError(data.error || 'Failed to issue bonds')
      }
    } catch (err) {
      setError('Error issuing bonds')
    } finally {
      setLoading(false)
    }
  }

  if (!bond) {
    return <div className="p-4">Loading bond status...</div>
  }

  return (
    <div className="space-y-6">
      {/* Bond Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Primary Market - Issue {bond.symbol} Bonds</span>
            <Badge variant={bond.canIssueMore ? "default" : "secondary"}>
              {bond.canIssueMore ? "Can Issue More" : "Fully Issued"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Supply</p>
              <p className="font-semibold">{bond.totalSupply.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Your Balance</p>
              <p className="font-semibold">{bond.issuerBalance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">For Sale</p>
              <p className="font-semibold">{bond.currentlyForSale.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Contract</p>
              <p className="font-mono text-xs">{bond.contractAddress?.slice(0, 10)}...</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issue New Bonds */}
      {bond.canIssueMore && (
        <Card>
          <CardHeader>
            <CardTitle>Issue Bonds to Market</CardTitle>
            <p className="text-sm text-gray-600">
              Create sell orders to make your bonds available for investors to purchase
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Price per Token (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={issuePrice}
                  onChange={(e) => setIssuePrice(e.target.value)}
                  placeholder="e.g., 1000.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <Input
                  type="number"
                  value={issueQuantity}
                  onChange={(e) => setIssueQuantity(e.target.value)}
                  placeholder={`Max: ${bond.issuerBalance}`}
                  max={bond.issuerBalance}
                />
              </div>
            </div>

            {/* Preview */}
            {issuePrice && issueQuantity && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900">Issue Preview</h4>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-blue-700">Total Value:</span>
                    <span className="ml-2 font-semibold">
                      ₹{(parseFloat(issuePrice) * parseInt(issueQuantity) || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Remaining Balance:</span>
                    <span className="ml-2 font-semibold">
                      {bond.issuerBalance - (parseInt(issueQuantity) || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            <Button 
              onClick={handleIssueBonds}
              disabled={loading || !issuePrice || !issueQuantity}
              className="w-full"
            >
              {loading ? 'Issuing...' : 'Issue Bonds to Market'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Sell Orders */}
      {bond.sellOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Market Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bond.sellOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-semibold">₹{order.price}</span>
                    <span className="text-gray-600 ml-2">per token</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{order.remaining.toLocaleString()} available</div>
                    <div className="text-sm text-gray-600">
                      {order.filled > 0 && `${order.filled} sold`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
