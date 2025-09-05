'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!user) {
    return null
  }

  const simMode = process.env.NEXT_PUBLIC_SIM_MODE !== 'false'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>
        <Link href="/">
          <Button variant="outline">← Back to Dashboard</Button>
        </Link>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your profile and verification status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Display Name</span>
              <div className="font-semibold">{user.displayName}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Email</span>
              <div className="font-semibold">{user.email}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">KYC Status</span>
              <div>
                {user.kycVerified ? (
                  <Badge className="bg-green-100 text-green-800">Verified</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Account Type</span>
              <div>
                <Badge variant="outline">Demo Account</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Mode</CardTitle>
          <CardDescription>Current settlement configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Settlement Mode</div>
              <div className="text-sm text-gray-500">
                {simMode ? 'Simulation mode - trades are simulated locally' : 'On-chain mode - trades settle on Sepolia testnet'}
              </div>
            </div>
            <Badge variant={simMode ? 'secondary' : 'default'}>
              {simMode ? 'SIM MODE' : 'ON-CHAIN'}
            </Badge>
          </div>
          
          {!simMode && (
            <div className="bg-blue-50 p-4 rounded">
              <div className="font-semibold text-blue-900">Blockchain Settings</div>
              <div className="text-sm text-blue-700 mt-1">
                Network: Sepolia Testnet<br />
                Wallet: {user.walletAddress || 'Not connected'}
              </div>
              <Button size="sm" className="mt-2" variant="outline">
                Connect MetaMask
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mock KYC */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Verification</CardTitle>
          <CardDescription>Identity verification for compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded">
            <div className="font-semibold text-yellow-900">Mock KYC Process</div>
            <div className="text-sm text-yellow-700 mt-1">
              In production, this would integrate with DigiLocker/CKYC for real identity verification.
            </div>
            {!user.kycVerified && (
              <Button size="sm" className="mt-2" variant="outline">
                Complete KYC (Demo)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
