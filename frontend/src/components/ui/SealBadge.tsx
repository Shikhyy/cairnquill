import { cn } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'

export function SealBadge({ sha, className }: { sha: string, className?: string }) {
  if (!sha) return null
  const prefix = sha.substring(0, 12)
  
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 bg-surface-2 rounded-md font-mono text-xs text-ink-2 border border-hairline", className)}>
      <ShieldCheck size={14} className="text-verified" />
      <span>{prefix}</span>
    </div>
  )
}
