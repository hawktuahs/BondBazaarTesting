'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UPIPaymentProps {
  amount: number
  purpose: string
  onSuccess: () => void
  onCancel: () => void
}

export default function UPIPayment({ amount, purpose, onSuccess, onCancel }: UPIPaymentProps) {
  const [step, setStep] = useState<'select' | 'upi' | 'processing' | 'success'>('select')
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [upiId, setUpiId] = useState('')

  const paymentMethods = [
    { id: 'paytm', name: 'Paytm', icon: '📱' },
    { id: 'phonepe', name: 'PhonePe', icon: '💜' },
    { id: 'gpay', name: 'Google Pay', icon: '🔵' },
    { id: 'bhim', name: 'BHIM UPI', icon: '🏛️' },
    { id: 'custom', name: 'Other UPI ID', icon: '💳' }
  ]

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId)
    if (methodId === 'custom') {
      setStep('upi')
    } else {
      // Simulate app redirect
      setStep('processing')
      setTimeout(() => {
        setStep('success')
      }, 2000)
    }
  }

  const handleUPISubmit = () => {
    if (!upiId.includes('@')) {
      alert('Please enter a valid UPI ID')
      return
    }
    setStep('processing')
    setTimeout(() => {
      setStep('success')
    }, 2000)
  }

  const handleSuccess = () => {
    onSuccess()
  }

  if (step === 'select') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
          <CardDescription>
            Pay ₹{amount.toLocaleString('en-IN')} for {purpose}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {paymentMethods.map(method => (
              <Button
                key={method.id}
                variant="outline"
                className="w-full justify-start h-12"
                onClick={() => handleMethodSelect(method.id)}
              >
                <span className="text-lg mr-3">{method.icon}</span>
                <span>{method.name}</span>
              </Button>
            ))}
          </div>
          
          <div className="pt-4 border-t">
            <Button variant="ghost" onClick={onCancel} className="w-full">
              Cancel Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'upi') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Enter UPI ID</CardTitle>
          <CardDescription>
            Pay ₹{amount.toLocaleString('en-IN')} using UPI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upi-id">UPI ID</Label>
            <Input
              id="upi-id"
              type="text"
              placeholder="yourname@paytm"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={handleUPISubmit} className="flex-1">
              Pay Now
            </Button>
            <Button variant="outline" onClick={() => setStep('select')}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'processing') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Processing Payment</CardTitle>
          <CardDescription>Please complete the payment in your UPI app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">
              Waiting for payment confirmation...
            </p>
            <Badge className="mt-2">₹{amount.toLocaleString('en-IN')}</Badge>
          </div>
          
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel Payment
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">Payment Successful!</CardTitle>
          <CardDescription>Your payment has been processed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-sm text-gray-600 mb-2">
              Successfully paid ₹{amount.toLocaleString('en-IN')}
            </p>
            <Badge className="bg-green-100 text-green-800">
              Transaction ID: TXN{Date.now()}
            </Badge>
          </div>
          
          <div className="bg-green-50 p-3 rounded text-sm">
            <strong>What's next?</strong>
            <br />
            Your funds will be available in your BondBazaar wallet within 2-3 minutes.
          </div>
          
          <Button onClick={handleSuccess} className="w-full">
            Continue to Trading
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
