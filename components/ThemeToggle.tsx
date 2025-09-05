'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 'light')

  useEffect(() => {
    // Run on client only
    const stored = window.localStorage.getItem('theme') as 'light' | 'dark' | null
    let nextTheme: 'light' | 'dark' = 'light'
    if (stored) {
      nextTheme = stored
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      nextTheme = prefersDark ? 'dark' : 'light'
    }
    setTheme(nextTheme)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    window.localStorage.setItem('theme', theme)
  }, [theme, mounted])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggle}
      className="rounded-full"
    >
      {mounted ? (
        theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
      ) : (
        // Stable placeholder during SSR and before mount to avoid hydration mismatch
        <span className="block h-5 w-5 rounded-full border" />
      )}
    </Button>
  )
}
