import React from 'react'

/**
 * Cinematic SVG Film Grain Overlay
 * 3.5% opacity monochromatic fractal noise to eliminate digital color banding.
 */

export function FilmGrain() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[9990] opacity-[0.035] mix-blend-overlay"
      aria-hidden="true"
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <filter id="cairn-grain">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.75" 
            numOctaves="3" 
            stitchTiles="stitch" 
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cairn-grain)" />
      </svg>
    </div>
  )
}
