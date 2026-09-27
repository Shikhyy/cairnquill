import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui'
import { Search, BookOpen, ExternalLink, MessageCircle } from 'lucide-react'

export default function AskPage() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string, source?: string, citations?: any[] }>>([
    {
      role: 'assistant',
      content: 'Hello. I am the CQ Assistant. I can help you search the regulatory knowledge base (e.g., PMLA 2002 guidelines, typologies) using Cortex Search.',
    }
  ])

  const askMutation = useMutation({
    mutationFn: (q: string) => api.ask(q),
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        source: data.source,
        citations: data.citations
      }])
    },
    onError: (err) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${String(err)}`
      }])
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || askMutation.isPending) return
    
    setMessages(prev => [...prev, { role: 'user', content: query }])
    askMutation.mutate(query)
    setQuery('')
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in fade-in">
      <div className="mb-6">
        <h1 className="text-title1 mb-1">Cortex Regulatory Assistant</h1>
        <p className="text-ink-2">Search the PMLA knowledge base for AML typologies and requirements.</p>
      </div>

      <div className="flex-1 bg-surface rounded-card border border-hairline shadow-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-judgement text-white'}`}>
                {msg.role === 'user' ? <UserIcon /> : <MessageCircle size={16} />}
              </div>
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-4 rounded-2xl ${msg.role === 'user' ? 'bg-accent text-white rounded-tr-sm' : 'bg-surface-2 text-ink rounded-tl-sm'}`}>
                  <p className="text-body whitespace-pre-wrap">{msg.content}</p>
                </div>
                
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.citations.map((cit, idx) => (
                      <a 
                        key={idx}
                        href={cit.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-surface p-3 rounded-lg border border-hairline text-left hover:border-accent transition-colors"
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-1">
                          <BookOpen size={14} />
                          {cit.source} — {cit.section}
                          <ExternalLink size={12} className="ml-auto" />
                        </div>
                        <p className="text-xs text-ink-2 line-clamp-2">{cit.passage}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {askMutation.isPending && (
            <div className="flex gap-4">
               <div className="w-8 h-8 rounded-full bg-judgement text-white flex items-center justify-center shrink-0">
                <MessageCircle size={16} />
              </div>
              <div className="bg-surface-2 p-4 rounded-2xl rounded-tl-sm text-ink-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-surface-2/30 border-t border-hairline">
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-2" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about PMLA 2002 or reporting requirements..."
              className="w-full bg-surface border border-hairline rounded-full py-3 pl-12 pr-24 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
            <Button 
              type="submit"
              disabled={!query.trim() || askMutation.isPending}
              className="absolute right-1 top-1 bottom-1 rounded-full px-6"
            >
              Ask
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
}
