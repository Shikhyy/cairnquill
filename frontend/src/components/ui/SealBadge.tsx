import { cn } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'

export function SealBadge({ sha, className }: { sha: string, className?: string }) {
  if (!sha) return null
  const prefix = sha.substring(0, 12)
  
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface-2 rounded-[3px] font-mono text-[11px] text-ink-2 border border-hairline hover:border-hairline-bold transition-colors select-none", 
        className
      )}
      title={`Full SHA-256 Seal: ${sha}`}
    >
      <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
      <span className="font-semibold text-ink">{prefix}</span>
      <span className="text-ink-faint">...</span>
    </div>
  )
}
