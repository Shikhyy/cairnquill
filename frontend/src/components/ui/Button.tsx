import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { sound } from '@/lib/soundEngine'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  magnetic?: number
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading, 
    children, 
    disabled, 
    onClick, 
    onMouseEnter,
    magnetic = 0.3,
    ...props 
  }, ref) => {
    const variants = {
      primary: 'bg-white text-black hover:bg-zinc-200 font-semibold border border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] active:scale-[0.98] transition-all',
      secondary: 'bg-surface-2 text-ink hover:bg-surface-3 hover:text-white border border-hairline hover:border-hairline-bold shadow-inset active:scale-[0.98] transition-all',
      outline: 'border border-hairline bg-surface hover:bg-surface-2 text-ink hover:border-accent/40 active:scale-[0.98] transition-all',
      ghost: 'bg-transparent hover:bg-surface-2 text-ink-2 hover:text-ink transition-colors',
      danger: 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 active:scale-[0.98] transition-all',
    }

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-xs font-mono',
      lg: 'h-11 px-6 text-sm font-mono',
    }
    
    return (
      <button
        ref={ref}
        disabled={loading || disabled}
        data-magnetic={magnetic}
        onMouseEnter={(e) => {
          sound.playClick(950, 0.015)
          onMouseEnter?.(e)
        }}
        onClick={(e) => {
          sound.playClick(750, 0.025)
          onClick?.(e)
        }}
        className={cn(
          'relative inline-flex items-center justify-center rounded-[4px] select-none overflow-hidden transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none group cursor-pointer will-change-transform',
          // Top specular highlight hairline
          'before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
