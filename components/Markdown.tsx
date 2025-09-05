"use client"

import React from 'react'

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderInlineToHtml(input: string) {
  let html = escapeHtml(input)
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Strong
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1<\/strong>')
  // Emphasis
  html = html.replace(/\*([^*]+)\*/g, '<em>$1<\/em>')
  html = html.replace(/_([^_]+)_/g, '<em>$1<\/em>')
  return html
}

export default function Markdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/)
  const elements: React.ReactNode[] = []

  type ListState = null | { type: 'ul' | 'ol'; items: string[] }
  let list: ListState = null

  const flushList = () => {
    if (!list) return
    if (list.type === 'ul') {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 my-2 space-y-1">
          {list.items.map((item, i) => (
            <li key={i} className="text-slate-900 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      )
    } else {
      elements.push(
        <ol key={`ol-${elements.length}`} className="list-decimal pl-5 my-2 space-y-1">
          {list.items.map((item, i) => (
            <li key={i} className="text-slate-900 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ol>
      )
    }
    list = null
  }

  lines.forEach((raw) => {
    const trimmed = raw.trim()
    if (trimmed.length === 0) {
      flushList()
      elements.push(<div key={`sp-${elements.length}`} className="h-2" />)
      return
    }

    // Ordered list: "1. text"
    if (/^\d+\.\s+/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s+/, '')
      if (!list || list.type !== 'ol') {
        flushList()
        list = { type: 'ol', items: [] }
      }
      list.items.push(renderInlineToHtml(content))
      return
    }

    // Unordered list: "- text" or "* text"
    if (/^[*-]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[*-]\s+/, '')
      if (!list || list.type !== 'ul') {
        flushList()
        list = { type: 'ul', items: [] }
      }
      list.items.push(renderInlineToHtml(content))
      return
    }

    flushList()

    // Full-line bold treated as a small heading
    const fullBoldMatch = trimmed.match(/^\*\*(.+)\*\*$/)
    if (fullBoldMatch) {
      elements.push(
        <h4 key={`h-${elements.length}`} className="font-semibold text-slate-900 dark:text-white">{fullBoldMatch[1]}</h4>
      )
      return
    }

    const html = renderInlineToHtml(trimmed)
    elements.push(
      <p key={`p-${elements.length}`} className="text-slate-900 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: html }} />
    )
  })

  flushList()

  return <div className="space-y-2 text-sm leading-6">{elements}</div>
}
