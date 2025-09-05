import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers'

export interface BlockchainConfig {
  rpcUrl: string
  privateKey: string
  factoryAddress: string
}

// Helper mapping for rating numbers to strings (kept local to blockchain service)
export function mapRatingNumberToString(ratingValue: number): string {
  const ratings: { [key: number]: string } = {
    95000: 'AAA',
    90000: 'AA+',
    85000: 'AA',
    80000: 'AA-',
    75000: 'A+',
    70000: 'A',
    65000: 'A-',
    60000: 'BBB+',
    55000: 'BBB'
  }
  return ratings[ratingValue] || 'NR'
}

export class BlockchainService {
  private provider: JsonRpcProvider
  private wallet: Wallet
  private config: BlockchainConfig

  constructor(config: BlockchainConfig) {
    this.config = config
    this.provider = new JsonRpcProvider(config.rpcUrl)
    this.wallet = new Wallet(config.privateKey, this.provider)
  }

  async executeTrade(bondId: string, buyerAddress: string, sellerAddress: string, quantity: number, price: number): Promise<string> {
    // Implementation for on-chain trade execution
    // This would interact with the BondFactory contract
    console.log(`Executing trade: ${quantity} tokens of ${bondId} at ₹${price}`)
    return 'mock-tx-hash'
  }

  async executeTokenTransfer(tokenAddress: string, fromAddress: string, toAddress: string, quantity: number, price: number): Promise<string> {
    try {
      console.log(`[Blockchain] Token Transfer:`, {
        token: tokenAddress,
        from: fromAddress,
        to: toAddress,
        qty: quantity,
        price: price
      })

      // Create token contract instance
      const tokenAbi = [
        "function transfer(address to, uint256 amount) external returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
        "function balanceOf(address owner) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
      ]

      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, this.wallet)
      
      // Convert quantity to proper token units (18 decimals)
      const amount = ethers.parseUnits(quantity.toString(), 18)
      
      // Execute transfer (this assumes the factory/deployer has custody and permission)
      const tx = await tokenContract.transfer(toAddress, amount)
      const receipt = await tx.wait()
      
      console.log(`[Blockchain] Transfer successful:`, receipt.hash)
      return receipt.hash
      
    } catch (error: any) {
      console.error('[Blockchain] Token transfer failed:', error)
      throw new Error(`Token transfer failed: ${error.message}`)
    }
  }

  async createBondToken(
    symbol: string,
    name: string,
    totalSupply: number,
    couponRate: number,
    maturityTimestamp: number,
    creditRating: number,
    issuerName?: string
  ): Promise<{ contractAddress: string; txHash: string }> {
    try {
      // Network and config diagnostics
      try {
        const network = await this.provider.getNetwork()
        console.log('[Blockchain] network:', { chainId: String(network.chainId), name: network.name })
      } catch (e) {
        console.log('[Blockchain] network: unavailable', e)
      }
      console.log('[Blockchain] wallet:', this.wallet.address)
      console.log('[Blockchain] factory:', this.config.factoryAddress)

      // Create bond token through factory contract (deployBond)
      const factory = new ethers.Contract(
        this.config.factoryAddress,
        [
          "function deployBond(string _bondId, string _name, string _symbol, string _issuer, uint256 _faceValue, uint256 _couponRate, uint256 _maturityDate, string _rating, uint256 _totalSupply) external returns (address)",
          "function getBondToken(string _bondId) external view returns (address)"
        ],
        this.wallet
      )

      const ratingLabel = mapRatingNumberToString(creditRating)
      const faceValue = 1000 // ₹1000 per token (passes as BigNumberish number)

      // Debug log for deployment parameters
      console.log('[Blockchain] deployBond params:', {
        bondId: symbol,
        name,
        symbol,
        issuer: issuerName || 'Issuer',
        faceValue,
        couponRate,
        maturityTimestamp,
        rating: ratingLabel,
        totalSupply: totalSupply
      })

      const tx = await factory.deployBond(
        symbol,                  // _bondId (use symbol as bondId)
        name,                    // _name
        symbol,                  // _symbol
        issuerName || 'Issuer',  // _issuer (fallback)
        faceValue,               // _faceValue (in rupees, no decimals on-chain)
        couponRate,              // _couponRate (basis points)
        maturityTimestamp,       // _maturityDate (unix seconds)
        ratingLabel,             // _rating (string)
        ethers.parseUnits(totalSupply.toString(), 18) // _totalSupply (token base units)
      )

      const receipt = await tx.wait()
      const contractAddress: string = await factory.getBondToken(symbol)

      return {
        contractAddress,
        txHash: receipt.hash
      }
    } catch (error: any) {
      console.error('Token creation failed:', error)
      throw new Error(`Failed to create bond token: ${error.message}`)
    }
  }

  async getTokenBalance(bondId: string, userAddress: string): Promise<string> {
    try {
      const factoryAbi = [
        "function getBondToken(string memory _bondId) external view returns (address)"
      ]
      
      const tokenAbi = [
        "function balanceOf(address owner) external view returns (uint256)"
      ]
      
      const factory = new ethers.Contract(this.config.factoryAddress, factoryAbi, this.provider)
      const tokenAddress = await factory.getBondToken(bondId)
      
      if (tokenAddress === ethers.ZeroAddress) {
        return "0"
      }
      
      const token = new ethers.Contract(tokenAddress, tokenAbi, this.provider)
      const balance = await token.balanceOf(userAddress)
      
      return ethers.formatEther(balance)
    } catch (error) {
      console.error('Failed to get token balance:', error)
      return "0"
    }
  }

  async getBondTokenAddress(bondId: string): Promise<string> {
    try {
      const factoryAbi = [
        "function getBondToken(string memory _bondId) external view returns (address)"
      ]
      
      const factory = new ethers.Contract(this.config.factoryAddress, factoryAbi, this.provider)
      return await factory.getBondToken(bondId)
    } catch (error) {
      console.error('Failed to get bond token address:', error)
      return ethers.ZeroAddress
    }
  }
}

// Singleton instance
let blockchainService: BlockchainService | null = null

export function getBlockchainService(): BlockchainService | null {
  if (process.env.SIM_MODE === 'true') {
    return null // Use simulation mode
  }

  if (!blockchainService) {
    const pkRaw = process.env.PRIVATE_KEY || ''
    const pk = pkRaw && pkRaw.startsWith('0x') ? pkRaw : (pkRaw ? `0x${pkRaw}` : '')
    const config = {
      rpcUrl: process.env.POLYGON_AMOY_RPC_URL || '',
      privateKey: pk,
      factoryAddress: process.env.BOND_FACTORY_ADDRESS || '0x8B3a350cf5F4e02C0f7A1e3e8C9D0B5e6A2F4D89'
    }

    if (!config.rpcUrl || !config.privateKey) {
      console.warn('Blockchain config incomplete, falling back to simulation mode')
      return null
    }

    blockchainService = new BlockchainService(config)
  }

  return blockchainService
}

// Polygon Amoy specific utilities
export function getWalletAddress(): string {
  if (!process.env.PRIVATE_KEY) return ''
  
  try {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY)
    return wallet.address
  } catch {
    return ''
  }
}

export function getNetworkInfo() {
  return {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL,
    blockExplorer: 'https://amoy.polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    }
  }
}
