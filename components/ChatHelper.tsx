'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Markdown from '@/components/Markdown'
import { Textarea } from '@/components/ui/textarea'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

const faqs: FAQ[] = [
  {
    id: '1',
    question: 'What are corporate bonds?',
    answer: 'Corporate bonds are debt securities issued by companies to raise capital. When you buy a bond, you\'re lending money to the company in exchange for regular interest payments and the return of principal at maturity.',
    category: 'basics'
  },
  {
    id: '2',
    question: 'How does fractional ownership work?',
    answer: 'BondBazaar tokenizes bonds into smaller units, allowing you to buy fractions of bonds starting from ₹1,000. Each token represents a proportional share of the bond\'s cash flows.',
    category: 'platform'
  },
  {
    id: '3',
    question: 'What is the minimum investment amount?',
    answer: 'The minimum investment is ₹1,000 per bond. This makes corporate bonds accessible to retail investors who previously couldn\'t afford the typical ₹10 lakh minimum.',
    category: 'trading'
  },
  {
    id: '4',
    question: 'How are trades settled?',
    answer: 'In demo mode, trades are simulated instantly. In production, trades settle on-chain using blockchain technology for transparency and security.',
    category: 'settlement'
  },
  {
    id: '5',
    question: 'What are the trading hours?',
    answer: 'Bond trading is available 24/7 on our platform, unlike traditional exchanges with fixed hours.',
    category: 'trading'
  },
  {
    id: '6',
    question: 'How is bond pricing determined?',
    answer: 'Bond prices are determined by market forces (supply and demand) and our price guidance system that considers G-Sec yields, credit ratings, and time to maturity.',
    category: 'pricing'
  },
  {
    id: '7',
    question: 'What happens at bond maturity?',
    answer: 'At maturity, bondholders receive the face value of their holdings. The tokens are automatically redeemed for cash.',
    category: 'basics'
  },
  {
    id: '8',
    question: 'Are there any fees?',
    answer: 'BondBazaar charges a small transaction fee of 0.1% on trades. There are no custody or annual maintenance fees.',
    category: 'fees'
  }
]

export default function ChatHelper() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedFaq, setSelectedFaq] = useState<FAQ | null>(null)
  const [mode, setMode] = useState<'faq' | 'ai'>('faq')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const categories = [
    { id: 'all', name: 'All Topics' },
    { id: 'basics', name: 'Bond Basics' },
    { id: 'platform', name: 'Platform' },
    { id: 'trading', name: 'Trading' },
    { id: 'pricing', name: 'Pricing' },
    { id: 'settlement', name: 'Settlement' },
    { id: 'fees', name: 'Fees' }
  ]

  const filteredFaqs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory)

  const sendMessage = async () => {
    const content = input.trim()
    if (!content) return
    setSending(true)
    setMessages((prev) => [...prev, { role: 'user', text: content }])
    setInput('')
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, { role: 'assistant', text: data.reply as string }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, I could not answer that right now.' }])
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Network error. Please try again.' }])
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsOpen(true)}
          className="rounded-full w-12 h-12 shadow-lg bg-blue-600 hover:bg-blue-700 animate-in zoom-in-50"
        >
          ?
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="shadow-xl animate-in slide-in-from-bottom-4">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Assistant</CardTitle>
              <CardDescription>FAQs and AI help</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant={mode === 'faq' ? 'default' : 'outline'} onClick={() => setMode('faq')}>FAQs</Button>
            <Button size="sm" variant={mode === 'ai' ? 'default' : 'outline'} onClick={() => setMode('ai')}>Ask AI</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
          {mode === 'ai' ? (
            <div className="flex flex-col h-80">
              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    Ask about bond basics, pricing, order types, or how to use the app. Avoid personal investment advice.
                  </div>
                )}
                {messages.map((m, idx) => (
                  <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                    {m.role === 'user' ? (
                      <div className="inline-block rounded px-3 py-2 text-sm bg-blue-600 text-white">
                        {m.text}
                      </div>
                    ) : (
                      <div className="inline-block rounded px-3 py-2 text-sm border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 max-w-[calc(100%-1rem)]">
                        <Markdown text={m.text} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t">
                <Textarea
                  placeholder="Type your question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="mb-2 resize-none h-16"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Powered by Gemini • Educational only</span>
                  <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()}>
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedFaq ? (
            <div className="space-y-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedFaq(null)}
                className="text-blue-600"
              >
                ← Back to FAQs
              </Button>
              <div>
                <h4 className="font-semibold text-sm mb-2">{selectedFaq.question}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedFaq.answer}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-1">
                {categories.map(category => (
                  <Badge
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>

              {/* FAQ List */}
              <div className="space-y-2">
                {filteredFaqs.map(faq => (
                  <div
                    key={faq.id}
                    className="p-2 rounded border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedFaq(faq)}
                  >
                    <div className="text-sm font-medium">{faq.question}</div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {categories.find(c => c.id === faq.category)?.name}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Contact Support */}
              <div className="pt-3 border-t">
                <div className="text-xs text-gray-500 mb-2">Need more help?</div>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Contact Support (Demo)
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
