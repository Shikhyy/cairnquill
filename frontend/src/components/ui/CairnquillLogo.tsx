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
}: CairnquillLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div 
        className="relative flex items-center justify-center shrink-0" 
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 64 64" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Deep Obsidian Tile */}
          <rect width="64" height="64" rx="8" fill="#0E1015" />
          <rect width="64" height="64" rx="8" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

          {/* Base Stone: Titanium Facet */}
          <path d="M12 45L22 39H42L52 45L40 51H24L12 45Z" fill="#181B24" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2"/>
          <path d="M24 51L32 46L40 51L32 53L24 51Z" fill="#11131A"/>

          {/* Mid Stone: Basalt Balance */}
          <path d="M17 33L26 28H38L47 33L37 38H27L17 33Z" fill="#222734" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2"/>

          {/* Keystone: Ground Truth Emerald */}
          <path d="M22 21L32 15L42 21L32 26L22 21Z" fill="#10B981" fillOpacity="0.95" stroke="#34D399" strokeWidth="1.2"/>

          {/* The Precision Quill: 45-degree surgical hairline */}
          <line x1="44" y1="11" x2="28" y2="27" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="28" cy="27" r="1.5" fill="#FFFFFF"/>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-ink">
              Cairnquill
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-mono tracking-widest font-semibold uppercase rounded-[3px] bg-surface-2 text-ink-2 border border-hairline">
              CoCo
            </span>
          </div>
          <span className="text-[10px] font-mono text-ink-2 tracking-wider uppercase mt-0.5">
            Cryptographic STR Copilot
          </span>
        </div>
      )}
    </div>
  )
}
