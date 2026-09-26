import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

export function SlaRing({ daysRemaining, className }: { daysRemaining: number, className?: string }) {
  const percentage = Math.max(0, Math.min(100, (daysRemaining / 7) * 100))
  const isUrgent = daysRemaining <= 2
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative w-5 h-5">
        <svg className="w-5 h-5 transform -rotate-90">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" className="text-surface-2" />
          <circle 
            cx="10" cy="10" r="8" 
            stroke="currentColor" 
            strokeWidth="2" 
            fill="none" 
            strokeDasharray="50.2" 
            strokeDashoffset={50.2 - (percentage / 100) * 50.2}
            className={cn("transition-all duration-500", isUrgent ? "text-danger" : "text-accent")} 
          />
        </svg>
      </div>
      <span className={cn("text-xs font-semibold tabular-nums", isUrgent && "text-danger")}>
        {daysRemaining}d left
      </span>
    </div>
  )
}
