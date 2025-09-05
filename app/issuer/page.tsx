'use client'

import { useState, useEffect, type ChangeEvent } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import IssueBonds from './issue-bonds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

export default function IssuerPage() {
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    totalSupply: '',
    couponRate: '',
    maturityYears: '',
    rating: '',
    issuerName: '',
    description: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [mintResult, setMintResult] = useState<any>(null)
  const [existingBonds, setExistingBonds] = useState<any[]>([])
  const [selectedBondForIssue, setSelectedBondForIssue] = useState<string | null>(null)
  const [showBondManagement, setShowBondManagement] = useState(false)
  const [isFixingBalances, setIsFixingBalances] = useState(false)

  useEffect(() => {
    fetchExistingBonds()
  }, [])

  const fetchExistingBonds = async () => {
    try {
      const response = await fetch('/api/bonds')
      if (response.ok) {
        const bonds = await response.json()
        setExistingBonds(bonds)
      }
    } catch (error) {
      console.error('Failed to fetch bonds:', error)
    }
  }

  const fixBalances = async () => {
    setIsFixingBalances(true)
    try {
      const response = await fetch('/api/fix-balance', { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        alert(`Fixed balances for ${result.fixedBonds?.length || 0} bonds`)
        fetchExistingBonds() // Refresh bonds
      } else {
        alert('Failed to fix balances')
      }
    } catch (error) {
      alert('Error fixing balances')
    } finally {
      setIsFixingBalances(false)
    }
  }

  const ratings = [
    { value: '95000', label: 'AAA' },
    { value: '90000', label: 'AA+' },
    { value: '85000', label: 'AA' },
    { value: '80000', label: 'AA-' },
    { value: '75000', label: 'A+' },
    { value: '70000', label: 'A' },
    { value: '65000', label: 'A-' },
    { value: '60000', label: 'BBB+' },
    { value: '55000', label: 'BBB' }
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleMintTokens = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/bonds/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: formData.symbol,
          name: formData.name,
          totalSupply: formData.totalSupply,
          couponRate: parseFloat(formData.couponRate) * 100, // Convert to basis points
          maturityYears: parseInt(formData.maturityYears),
          rating: parseInt(formData.rating),
          issuerName: formData.issuerName,
          description: formData.description
        })
      })

      if (response.ok) {
        const result = await response.json()
        setMintResult(result)
        // Clear form
        setFormData({
          symbol: '',
          name: '',
          totalSupply: '',
          couponRate: '',
          maturityYears: '',
          rating: '',
          issuerName: '',
          description: ''
        })
      } else {
        alert('Failed to mint tokens. Please try again.')
      }
    } catch (error) {
      console.error('Minting failed:', error)
      alert('Minting failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (mintResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-green-600 mb-2">Tokens Successfully Minted!</h2>
          <p className="text-gray-600">Your corporate bond has been tokenized on Polygon Amoy</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tokenization Complete</CardTitle>
            <CardDescription>Your bond is now live on the blockchain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Bond Symbol</Label>
                <div className="text-lg font-semibold">{mintResult.symbol}</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Token Contract</Label>
                <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                  {mintResult.contractAddress}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Total Supply</Label>
                <div className="text-lg font-semibold">{parseInt(mintResult.totalSupply).toLocaleString()} tokens</div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Transaction Hash</Label>
                <div className="text-sm font-mono bg-gray-100 p-2 rounded truncate">
                  {mintResult.txHash}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">🔗 Blockchain Links</h3>
              <div className="space-y-2">
                <a 
                  href={`https://amoy.polygonscan.com/address/${mintResult.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline"
                >
                  View Contract on Polygon Amoy Explorer →
                </a>
                <a 
                  href={`https://amoy.polygonscan.com/tx/${mintResult.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline"
                >
                  View Transaction on Explorer →
                </a>
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button onClick={() => setMintResult(null)}>
                Issue Another Bond
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedBondForIssue(mintResult.bondId)
                  setShowBondManagement(true)
                  setMintResult(null)
                }}
              >
                Issue to Market Now
              </Button>
              <Link href="/">
                <Button variant="outline">
                  View on Trading Platform
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Bond Tokenization Platform</h1>
        <p className="text-xl text-gray-600">Issue your corporate bond as blockchain tokens</p>
        <div className="flex justify-center space-x-2 mt-4">
          <Badge className="bg-blue-100 text-blue-800">ERC-20 Tokens</Badge>
          <Badge className="bg-green-100 text-green-800">Polygon Amoy</Badge>
          <Badge className="bg-purple-100 text-purple-800">Fractional Trading</Badge>
        </div>
      </div>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 How Tokenization Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-3xl">📄</div>
              <h3 className="font-semibold">1. Issue Bond</h3>
              <p className="text-sm text-gray-600">Create your corporate bond with terms</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl">⚡</div>
              <h3 className="font-semibold">2. Deploy Contract</h3>
              <p className="text-sm text-gray-600">Smart contract deployed on Polygon</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl">🪙</div>
              <h3 className="font-semibold">3. Mint Tokens</h3>
              <p className="text-sm text-gray-600">ERC-20 tokens representing bond units</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl">💱</div>
              <h3 className="font-semibold">4. Enable Trading</h3>
              <p className="text-sm text-gray-600">Fractional trading from ₹1,000</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 mb-6">
        <Button 
          variant={!showBondManagement ? "default" : "outline"}
          onClick={() => setShowBondManagement(false)}
        >
          📄 Create New Bond
        </Button>
        <Button 
          variant={showBondManagement ? "default" : "outline"}
          onClick={() => setShowBondManagement(true)}
        >
          💱 Manage Existing Bonds ({existingBonds.length})
        </Button>
      </div>

      {showBondManagement ? (
        /* Bond Management Section */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Bond Portfolio Management</span>
                <Button 
                  onClick={fixBalances}
                  disabled={isFixingBalances}
                  variant="outline"
                  size="sm"
                >
                  {isFixingBalances ? 'Fixing...' : '🔧 Fix Balances'}
                </Button>
              </CardTitle>
              <CardDescription>Issue your minted bonds to the market for investors to purchase</CardDescription>
            </CardHeader>
            <CardContent>
              {existingBonds.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📭</div>
                  <h3 className="text-lg font-semibold mb-2">No Bonds Found</h3>
                  <p className="text-gray-600 mb-4">Create your first bond to start tokenizing</p>
                  <Button onClick={() => setShowBondManagement(false)}>
                    Create New Bond
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {existingBonds.map((bond) => (
                    <div key={bond.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{bond.symbol}</h3>
                          <p className="text-gray-600">{bond.name}</p>
                          <div className="flex space-x-4 mt-2 text-sm">
                            <span>Supply: {bond.outstandingUnits?.toLocaleString()}</span>
                            <span>Coupon: {(bond.couponRate / 100).toFixed(2)}%</span>
                            <span>Maturity: {bond.maturityYears}y</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {bond.contractAddress && (
                            <Badge className="bg-green-100 text-green-800 mb-2">
                              ✅ Minted
                            </Badge>
                          )}
                          <div className="text-xs text-gray-500">
                            {bond.contractAddress?.slice(0, 10)}...
                          </div>
                        </div>
                      </div>
                      
                      {bond.contractAddress ? (
                        <div className="space-y-4">
                          <Button 
                            variant="outline"
                            onClick={() => setSelectedBondForIssue(selectedBondForIssue === bond.id ? null : bond.id)}
                            className="w-full"
                          >
                            {selectedBondForIssue === bond.id ? 'Hide Issue Panel' : '💱 Issue to Market'}
                          </Button>
                          
                          {selectedBondForIssue === bond.id && (
                            <div className="border-t pt-4">
                              <IssueBonds bondId={bond.id} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-yellow-800 text-sm">
                            ⚠️ This bond exists in database but hasn't been minted on blockchain yet.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Bond Issuance Form */
      <Card>
        <CardHeader>
          <CardTitle>Issue New Corporate Bond</CardTitle>
          <CardDescription>Tokenize your corporate bond on the blockchain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issuerName">Issuer Name</Label>
              <Input
                id="issuerName"
                placeholder="e.g., Reliance Industries Ltd"
                value={formData.issuerName}
                onChange={(e) => handleInputChange('issuerName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="symbol">Bond Symbol</Label>
              <Input
                id="symbol"
                placeholder="e.g., REL28"
                value={formData.symbol}
                onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="name">Bond Name</Label>
            <Input
              id="name"
              placeholder="e.g., Reliance Industries 2028 8.5% Bond"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the bond and use of funds..."
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="totalSupply">Total Supply (tokens)</Label>
              <Input
                id="totalSupply"
                type="number"
                placeholder="1000000"
                value={formData.totalSupply}
                onChange={(e) => handleInputChange('totalSupply', e.target.value)}
              />
              <div className="text-xs text-gray-500 mt-1">
                Each token = ₹1000 bond value
              </div>
            </div>
            <div>
              <Label htmlFor="couponRate">Coupon Rate (%)</Label>
              <Input
                id="couponRate"
                type="number"
                step="0.01"
                placeholder="8.5"
                value={formData.couponRate}
                onChange={(e) => handleInputChange('couponRate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="maturityYears">Maturity (years)</Label>
              <Input
                id="maturityYears"
                type="number"
                placeholder="5"
                value={formData.maturityYears}
                onChange={(e) => handleInputChange('maturityYears', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rating">Credit Rating</Label>
            <select
              id="rating"
              className="w-full p-2 border rounded"
              value={formData.rating}
              onChange={(e) => handleInputChange('rating', e.target.value)}
            >
              <option value="">Select Credit Rating</option>
              {ratings.map(rating => (
                <option key={rating.value} value={rating.value}>
                  {rating.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Tokenization Benefits</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Fractional Trading:</strong> Investors can buy from ₹1,000 vs ₹10 lakh minimum</li>
              <li>• <strong>Instant Settlement:</strong> T+0 blockchain settlement vs T+2 traditional</li>
              <li>• <strong>24/7 Trading:</strong> Global accessibility beyond market hours</li>
              <li>• <strong>Transparency:</strong> All transactions visible on blockchain</li>
              <li>• <strong>Programmable:</strong> Smart contracts enable automated features</li>
            </ul>
          </div>

          <Button 
            onClick={handleMintTokens}
            disabled={isLoading || !formData.symbol || !formData.name || !formData.totalSupply}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Minting Tokens...' : '🪙 Mint Bond Tokens on Polygon Amoy'}
          </Button>

          <div className="text-center text-sm text-gray-500">
            <p>By minting, you deploy an ERC-20 contract on Polygon Amoy testnet</p>
            <p>Gas fees paid from configured deployer wallet</p>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
