import * as React from 'react'
import { cn } from '@/lib/utils'

export function Chip({ 
  children, 
  variant = 'default', 
  className 
}: { 
  children: React.ReactNode
  variant?: 'default' | 'verified' | 'contradicted' | 'unsupported' | 'judgement' | 'danger'
  className?: string 
}) {
  const variants = {
    default: 'bg-surface-2 text-ink-2 border-hairline',
    verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    contradicted: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    unsupported: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
    judgement: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-semibold uppercase tracking-wider border",
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
