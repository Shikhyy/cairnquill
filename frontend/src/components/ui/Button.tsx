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
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading, 
    children, 
    disabled, 
    onClick, 
    ...props 
  }, ref) => {
    const variants = {
      primary: 'bg-white text-zinc-950 hover:bg-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] border border-white/20 active:scale-[0.98]',
      secondary: 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white border border-zinc-700/80 shadow-[0_1px_2px_rgba(0,0,0,0.4)] active:scale-[0.98]',
      outline: 'bg-zinc-950/60 text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800 active:scale-[0.98]',
      ghost: 'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 active:scale-[0.98]',
      danger: 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 active:scale-[0.98]',
    }

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
      md: 'h-9 px-4 text-sm rounded-md gap-2',
      lg: 'h-11 px-5 text-sm rounded-lg gap-2.5',
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
          'inline-flex items-center justify-center font-medium font-sans select-none transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
