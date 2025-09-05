import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import ChatHelper from '@/components/ChatHelper'
import ThemeToggle from '@/components/ThemeToggle'

const fontSans = Plus_Jakarta_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BondBazaar - Corporate Bond Trading',
  description: 'P2P Corporate Bond Trading Platform with Fractional Ownership',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.className} bg-background text-foreground antialiased`}>
        {/* Pre-hydration theme setter to avoid flash/mismatch */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s|| (d?'dark':'light');var r=document.documentElement.classList;t==='dark'?r.add('dark'):r.remove('dark')}catch(e){}}();`,
          }}
        />
        <div className="relative min-h-screen">
          {/* Animated background */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_800px_at_-10%_-20%,#dbeafe,transparent),radial-gradient(1000px_600px_at_110%_10%,#ffe4e6,transparent)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-white/60 via-white/30 to-transparent dark:from-slate-900/60 dark:via-slate-900/30 animate-gradient bg-[length:200%_200%]" />

          {/* Header */}
          <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 animate-float">BondBazaar</h1>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">PROTOTYPE</span>
                </div>
                <div className="flex items-center gap-2">
                  <nav className="hidden sm:flex items-center gap-2 text-sm">
                    <a href="/wallet" className="px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Wallet</a>
                    <a href="/portfolio" className="px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Portfolio</a>
                    <a href="/settings" className="px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Settings</a>
                  </nav>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in-50">
            {children}
          </main>

          {/* Chat Helper */}
          <ChatHelper />

          {/* Demo Disclaimer */}
          <div className="fixed bottom-0 left-0 right-0 p-2 border-t bg-white/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
            <div className="text-center text-xs text-red-700">
              <strong>DEMO ONLY:</strong> This is a prototype. No real money or securities are involved.
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
