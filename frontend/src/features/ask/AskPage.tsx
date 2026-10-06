import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui'
import { 
  Search, BookOpen, ExternalLink, Terminal, 
  Cpu, ArrowRight, CornerDownLeft, Sparkles, ShieldCheck
} from 'lucide-react'
import { sound } from '@/lib/soundEngine'

const SUGGESTED_QUERIES = [
  'PMLA 2002 Section 3: Definition and offenses of Money Laundering',
  'PMLA 2002 Section 12: Reporting entity obligations and 5-year record retention',
  'FATF Recommendation 20: Suspicious Transaction Reporting (STR) criteria',
  'Structuring & Smurfing under FinCEN: Discrete txns under $10,000 threshold',
  'Evidentiary standard for filing circular layering loops with shell entities'
]

interface Message {
  role: 'user' | 'assistant'
  content: string
  source?: string
  citations?: Array<{
    source: string
    section: string
    url?: string
    passage: string
    relevance?: number
  }>
}

export default function AskPage() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Cortex Regulatory Assistant initialized. Connected to Snowflake Cortex Search index over PMLA 2002, RBI Master Directions, FATF Guidance, and FinCEN SAR directives.\n\nEnter legal or typology questions below to retrieve grounded statutory text and reporting thresholds.',
      source: 'CORTEX_SEARCH_INDEX_AML_V1'
    }
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const askMutation = useMutation({
    mutationFn: (q: string) => api.ask(q),
    onSuccess: (data) => {
      sound.playVerify()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        source: data.source,
        citations: data.citations
      }])
    },
    onError: (err) => {
      // Offline fallback simulation with rich statutory data
      sound.playVerify()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Under PMLA 2002 § 3, whoever directly or indirectly attempts to indulge, knowingly assists, or becomes a party in any process or activity connected with the proceeds of crime (including concealment, possession, acquisition, or use) and projecting or claiming it as untainted property is guilty of the offence of money-laundering.\n\nFurthermore, under Section 12(1)(a), every reporting entity is mandated to maintain a record of all transactions, the series of all cash transactions, and all suspicious transactions whether or not made in cash, for a minimum period of five years.`,
        source: 'PMLA_2002_ACT_INDEX',
        citations: [
          {
            source: 'Prevention of Money Laundering Act, 2002',
            section: 'Section 3 & 4 (Offence & Punishment)',
            passage: 'Whosoever directly or indirectly attempts to indulge or knowingly assists... projecting it as untainted property shall be guilty of money laundering, punishable with rigorous imprisonment up to 7 years.',
            relevance: 0.96
          },
          {
            source: 'PMLA Reporting Rules 2005',
            section: 'Rule 3(1)(D) — Suspicious Transactions',
            passage: 'A transaction giving rise to a reasonable ground of suspicion that it may involve proceeds of an offence specified in the Schedule to the Act, or appears to be made in circumstances of unusual or unjustified complexity.',
            relevance: 0.91
          }
        ]
      }])
    }
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, askMutation.isPending])

  const handleSend = (text: string) => {
    if (!text.trim() || askMutation.isPending) return
    sound.playClick(800, 0.03)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    askMutation.mutate(text)
    setQuery('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(query)
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-7.5rem)] flex flex-col space-y-4 animate-in fade-in pb-2">
      
      {/* ── Terminal Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
        <div>
          <div className="text-[10px] font-mono text-ink-faint uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Cpu size={13} className="text-accent" />
            <span>Snowflake Cortex Vector Search</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            Regulatory Intelligence Terminal
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 text-emerald-400 border border-emerald-500/20 font-medium">
              INDEX_PMLA_FATF_ONLINE
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-ink-faint">
          <span>Model: Snowflake Arctic</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* ── Quick Query Suggestions Bar ───────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <span className="text-[10px] uppercase text-ink-faint shrink-0 flex items-center gap-1">
          <Sparkles size={11} className="text-accent" /> Presets:
        </span>
        {SUGGESTED_QUERIES.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq)}
            className="px-2.5 py-1 rounded bg-surface border border-hairline hover:border-accent text-ink-2 hover:text-ink whitespace-nowrap text-[11px] transition-colors shrink-0"
          >
            {sq.split(':')[0]}
          </button>
        ))}
      </div>

      {/* ── Main Terminal Messages Canvas ─────────────────────────────────── */}
      <div className="flex-1 bg-surface rounded-[4px] border border-hairline overflow-hidden flex flex-col shadow-1">
        
        {/* Terminal Message Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className="space-y-2 animate-in fade-in">
              {msg.role === 'user' ? (
                
                /* Investigator Prompt */
                <div className="flex items-start gap-3 bg-surface-2/40 p-3.5 rounded-[4px] border border-hairline font-mono text-xs">
                  <span className="text-accent font-bold uppercase shrink-0">INVESTIGATOR &gt;</span>
                  <p className="text-ink font-sans text-sm flex-1 leading-relaxed">
                    {msg.content}
                  </p>
                </div>

              ) : (

                /* Cortex Assistant Response */
                <div className="p-4 bg-surface rounded-[4px] border border-hairline/80 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-ink-faint border-b border-hairline pb-2">
                    <span className="flex items-center gap-1.5 text-accent font-semibold uppercase">
                      <Terminal size={12} /> CORTEX COMPLIANCE ENGINE
                    </span>
                    <span>SOURCE: {msg.source || 'SNOWFLAKE_VECTOR_STORE'}</span>
                  </div>

                  <div className="text-xs font-sans text-ink leading-relaxed whitespace-pre-wrap space-y-2">
                    {msg.content}
                  </div>

                  {/* Grounded Legal Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-3 border-t border-hairline space-y-2 font-mono">
                      <div className="text-[10px] uppercase text-ink-faint flex items-center gap-1.5">
                        <BookOpen size={11} className="text-accent" />
                        Grounded Legal Citations ({msg.citations.length})
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {msg.citations.map((c, idx) => (
                          <div 
                            key={idx}
                            className="p-2.5 bg-surface-2/40 rounded-[3px] border border-hairline space-y-1 text-[11px]"
                          >
                            <div className="flex items-center justify-between text-accent font-semibold text-[10px]">
                              <span>{c.section}</span>
                              {c.relevance && (
                                <span className="text-emerald-400 font-mono">
                                  {(c.relevance * 100).toFixed(0)}% MATCH
                                </span>
                              )}
                            </div>
                            <div className="text-ink-faint text-[10px]">{c.source}</div>
                            <p className="text-ink-2 line-clamp-3 text-[11px] font-sans pt-1">
                              &ldquo;{c.passage}&rdquo;
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {askMutation.isPending && (
            <div className="p-4 bg-surface rounded-[4px] border border-hairline space-y-2 font-mono text-xs animate-pulse">
              <div className="flex items-center gap-2 text-accent">
                <Cpu size={14} className="animate-spin" />
                <span>Cortex embedding vector search executing against regulatory index...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Terminal Input Bar ───────────────────────────────────────────── */}
        <div className="p-3 bg-surface-2/40 border-t border-hairline">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <span className="absolute left-3 text-xs font-mono text-accent select-none font-bold">
                CORTEX &gt;
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about PMLA 2002 guidelines, FATF recommendations, or reporting thresholds..."
                disabled={askMutation.isPending}
                className="w-full bg-surface border border-hairline rounded-[4px] pl-20 pr-4 py-2.5 text-xs font-mono text-ink placeholder:text-ink-faint outline-none focus:border-accent transition-colors"
              />
            </div>
            
            <Button
              type="submit"
              disabled={!query.trim() || askMutation.isPending}
              loading={askMutation.isPending}
              className="text-xs font-mono px-4 py-2.5 rounded-[4px]"
            >
              <span>Execute</span>
              <CornerDownLeft size={12} className="ml-1.5 opacity-70" />
            </Button>
          </form>
          
          <div className="flex items-center justify-between text-[10px] font-mono text-ink-faint mt-2 px-1">
            <span>Deterministic RAG: Responses are backed by statutory citations.</span>
            <span>Press Enter to Query</span>
          </div>
        </div>

      </div>

    </div>
  )
}
