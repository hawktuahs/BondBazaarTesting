declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, handler: (accounts: any) => void) => void
      removeListener: (event: string, handler: (accounts: any) => void) => void
      isMetaMask?: boolean
    }
  }
}

export {}
