'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface WalletState {
  address: string | null
  chainId: number | null
  balance: string
  connected: boolean
}

export default function WalletConnect() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: '0',
    connected: false
  })
  const [isConnecting, setIsConnecting] = useState(false)

  const POLYGON_AMOY_CHAIN_ID = 80002

  useEffect(() => {
    checkWalletConnection()
    setupEventListeners()
  }, [])

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          await updateWalletState(accounts[0])
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error)
      }
    }
  }

  const setupEventListeners = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
    }
  }

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length > 0) {
      await updateWalletState(accounts[0])
    } else {
      setWallet({
        address: null,
        chainId: null,
        balance: '0',
        connected: false
      })
    }
  }

  const handleChainChanged = (chainId: string) => {
    window.location.reload() // Reload to ensure consistency
  }

  const updateWalletState = async (address: string) => {
    if (!window.ethereum) {
      console.error('MetaMask not available')
      return
    }
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      })
      
      // Convert balance from wei to MATIC
      const balanceInMatic = (parseInt(balance, 16) / 1e18).toFixed(4)

      setWallet({
        address,
        chainId: parseInt(chainId, 16),
        balance: balanceInMatic,
        connected: true
      })
    } catch (error) {
      console.error('Error updating wallet state:', error)
    }
  }

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask is not installed. Please install MetaMask to continue.')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      if (accounts.length > 0) {
        await updateWalletState(accounts[0])
        
        // Check if we're on the correct network
        if (wallet.chainId !== POLYGON_AMOY_CHAIN_ID) {
          await switchToPolygonAmoy()
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  const switchToPolygonAmoy = async () => {
    if (!window.ethereum) {
      alert('MetaMask not available')
      return
    }
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}` }]
      })
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902 && window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}`,
              chainName: 'Polygon Amoy Testnet',
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18
              },
              rpcUrls: ['https://rpc-amoy.polygon.technology/'],
              blockExplorerUrls: ['https://amoy.polygonscan.com/']
            }]
          })
        } catch (addError) {
          console.error('Error adding network:', addError)
        }
      }
    }
  }

  const disconnectWallet = () => {
    setWallet({
      address: null,
      chainId: null,
      balance: '0',
      connected: false
    })
  }

  const isCorrectNetwork = wallet.chainId === POLYGON_AMOY_CHAIN_ID

  if (!wallet.connected) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Wallet</CardTitle>
          <CardDescription>
            Connect your MetaMask wallet to trade on Polygon Amoy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className="text-4xl mb-4">🔗</div>
            <p className="text-sm text-gray-600 mb-4">
              Connect your wallet to enable blockchain trading
            </p>
            <Button 
              onClick={connectWallet} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
          </div>
          
          <div className="bg-blue-50 p-3 rounded text-sm">
            <strong>Required:</strong>
            <br />
            • MetaMask browser extension
            <br />
            • Polygon Amoy testnet setup
            <br />
            • Test MATIC for gas fees
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Wallet Connected
          {isCorrectNetwork ? (
            <Badge className="bg-green-100 text-green-800">Polygon Amoy</Badge>
          ) : (
            <Badge variant="destructive">Wrong Network</Badge>
          )}
        </CardTitle>
        <CardDescription>Your blockchain wallet status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-500">Address</span>
            <div className="font-mono text-sm">
              {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : ''}
            </div>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Balance</span>
            <div className="font-semibold">
              {wallet.balance} MATIC
            </div>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Network</span>
            <div className="text-sm">
              {isCorrectNetwork ? 'Polygon Amoy Testnet' : `Chain ID: ${wallet.chainId}`}
            </div>
          </div>
        </div>
        
        {!isCorrectNetwork && (
          <div className="bg-yellow-50 p-3 rounded">
            <div className="text-sm text-yellow-800 mb-2">
              <strong>Wrong Network</strong>
            </div>
            <Button 
              size="sm" 
              onClick={switchToPolygonAmoy}
              variant="outline"
              className="w-full"
            >
              Switch to Polygon Amoy
            </Button>
          </div>
        )}
        
        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            onClick={disconnectWallet}
            className="w-full"
          >
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
