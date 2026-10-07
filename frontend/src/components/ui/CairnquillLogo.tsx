import React from 'react'

interface CairnquillLogoProps {
  size?: number
  showText?: boolean
  className?: string
}

export function CairnquillLogo({
  size = 28,
  showText = false,
  className = '',
}: CairnquillLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div 
        className="relative flex items-center justify-center shrink-0" 
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 32 32" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Obsidian Architectural Base Frame */}
          <rect width="32" height="32" rx="7" fill="#121216" />
          <rect width="32" height="32" rx="7" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

          {/* Balanced Cairn Monoliths */}
          {/* Base Foundation Tier */}
          <rect x="7" y="21" width="18" height="3.5" rx="1.75" fill="#27272A" />
          <line x1="8.5" y1="21.5" x2="23.5" y2="21.5" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" />

          {/* Mid Keystone Tier */}
          <rect x="9.5" y="15" width="13" height="3.5" rx="1.75" fill="#3F3F46" />
          <line x1="11" y1="15.5" x2="21" y2="15.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />

          {/* Top Beacon Keystone Tier */}
          <rect x="12" y="9" width="8" height="3.5" rx="1.75" fill="#38BDF8" />
          <line x1="13.5" y1="9.5" x2="18.5" y2="9.5" stroke="#FFFFFF" strokeWidth="0.75" />

          {/* Precision 45-degree Quill Needle */}
          <path d="M22.5 6.5L10.5 24.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="10.5" cy="24.5" r="1.2" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.6" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-ink font-display">
              Cairnquill
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-mono tracking-widest font-semibold uppercase rounded-[3px] bg-surface-2 text-ink-2 border border-hairline">
              CoCo
            </span>
          </div>
          <span className="text-[10px] font-mono text-ink-faint tracking-wider uppercase mt-0.5">
            Cryptographic STR Copilot
          </span>
        </div>
      )}
    </div>
  )
}
