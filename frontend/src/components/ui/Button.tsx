import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { sound } from '@/lib/soundEngine'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, onClick, ...props }, ref) => {
    const variants = {
      primary: 'bg-ink text-canvas hover:bg-white font-medium border border-hairline shadow-inset active:scale-[0.99] transition-all',
      secondary: 'bg-surface-2 text-ink hover:bg-surface-3 border border-hairline font-medium shadow-inset active:scale-[0.99] transition-all',
      outline: 'border border-hairline bg-surface hover:bg-surface-2 text-ink font-medium active:scale-[0.99] transition-all',
      ghost: 'bg-transparent hover:bg-surface-2 text-ink-2 hover:text-ink font-medium transition-colors',
      danger: 'bg-danger/20 text-rose-300 hover:bg-danger/30 border border-danger/40 font-medium active:scale-[0.99] transition-all',
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
        onClick={(e) => {
          sound.playClick(750, 0.02)
          onClick?.(e)
        }}
        className={cn(
          'inline-flex items-center justify-center rounded-[4px] transition-all disabled:opacity-40 disabled:pointer-events-none select-none',
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
