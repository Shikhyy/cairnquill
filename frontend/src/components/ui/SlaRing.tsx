import { cn } from '@/lib/utils'

export function SlaRing({ daysRemaining, className }: { daysRemaining: number, className?: string }) {
  const percentage = Math.max(0, Math.min(100, (daysRemaining / 7) * 100))
  const isUrgent = daysRemaining <= 2
  
  return (
    <div className={cn("inline-flex items-center gap-1.5 font-mono text-[11px]", className)}>
      <div className="relative w-4 h-4 shrink-0">
        <svg className="w-4 h-4 transform -rotate-90">
          <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" fill="none" />
          <circle 
            cx="8" cy="8" r="6" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            fill="none" 
            strokeDasharray="37.7" 
            strokeDashoffset={37.7 - (percentage / 100) * 37.7}
            className={cn("transition-all duration-500", isUrgent ? "text-rose-400" : "text-emerald-400")} 
          />
        </svg>
      </div>
      <span className={cn("tabular-nums font-semibold", isUrgent ? "text-rose-400" : "text-ink-2")}>
        {daysRemaining}d SLA
      </span>
    </div>
  )
}
