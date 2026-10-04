import React from 'react'

interface CairnquillLogoProps {
  size?: number
  showText?: boolean
  className?: string
  glow?: boolean
}

export function CairnquillLogo({
  size = 32,
  showText = false,
  className = '',
  glow = true,
}: CairnquillLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div 
        className="relative flex items-center justify-center shrink-0" 
        style={{ width: size, height: size }}
      >
        {glow && (
          <div 
            className="absolute inset-0 rounded-xl bg-gradient-to-tr from-accent/40 via-cyan-400/30 to-verified/40 blur-md opacity-75 -z-10 animate-pulse" 
            style={{ animationDuration: '4s' }}
          />
        )}
        <svg 
          viewBox="0 0 64 64" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id="cqGradStone1" x1="12" y1="42" x2="52" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="60%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="cqGradStone2" x1="18" y1="28" x2="46" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="cqGradQuill" x1="30" y1="6" x2="50" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="50%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>

          {/* Base Container */}
          <rect width="64" height="64" rx="16" fill="#0A0B11" />
          <rect width="64" height="64" rx="16" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />

          {/* Stacked Cairn Stones */}
          {/* Base Foundation Stone */}
          <path 
            d="M13 47C13 43 18.5 40.5 32 40.5C45.5 40.5 51 43 51 47C51 51 45.5 53.5 32 53.5C18.5 53.5 13 51 13 47Z" 
            fill="url(#cqGradStone1)" 
          />
          
          {/* Mid Stone */}
          <path 
            d="M18 33.5C18 30 23 28 32 28C41 28 46 30 46 33.5C46 37 41 39 32 39C23 39 18 37 18 33.5Z" 
            fill="url(#cqGradStone2)" 
          />
          
          {/* Keystone */}
          <path 
            d="M23 21C23 18.5 26.8 17 32 17C37.2 17 41 18.5 41 21C41 23.5 37.2 25 32 25C26.8 25 23 23.5 23 21Z" 
            fill="#10B981" 
          />

          {/* Quill Blade Overlay */}
          <path 
            d="M37 8L50 21L39 32L31.5 32L31.5 24.5L37 8Z" 
            fill="url(#cqGradQuill)" 
          />
          <circle cx="35" cy="27" r="1.75" fill="#FFFFFF" />
          <line x1="39" y1="23" x2="35" y2="27" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Cairnquill
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-mono tracking-widest font-bold uppercase rounded bg-accent/20 text-cyan-400 border border-cyan-500/30">
              CoCo
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 tracking-wider uppercase mt-0.5">
            Deterministic AML Copilot
          </span>
        </div>
      )}
    </div>
  )
}
