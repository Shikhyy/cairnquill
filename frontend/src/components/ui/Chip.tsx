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
    default: 'bg-surface-2 text-ink',
    verified: 'bg-verified/10 text-verified border border-verified/20',
    contradicted: 'bg-contradicted/10 text-contradicted border border-contradicted/20',
    unsupported: 'bg-unsupported/10 text-unsupported border border-unsupported/20',
    judgement: 'bg-judgement/10 text-judgement border border-judgement/20',
    danger: 'bg-danger/10 text-danger border border-danger/20',
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-pill text-[11px] font-bold uppercase tracking-wider",
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
