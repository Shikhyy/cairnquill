import React, { useRef } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'

export interface TiltCardProps {
  children: React.ReactNode
  className?: string
  glareIntensity?: number
  tiltStrength?: number
}

export const TiltCard: React.FC<TiltCardProps> = ({ 
  children, 
  className,
  glareIntensity = 0.25,
  tiltStrength = 8
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    const glare = glareRef.current
    if (!card || !glare) return

    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -tiltStrength
    const rotateY = ((x - centerX) / centerX) * tiltStrength

    gsap.to(card, {
      rotateX,
      rotateY,
      transformPerspective: 1200,
      ease: 'power1.out',
      duration: 0.35,
    })

    // Smooth specular glare coordinate tracking
    gsap.to(glare, {
      x,
      y,
      opacity: glareIntensity,
      duration: 0.2,
      ease: 'power1.out'
    })
  }

  const handleMouseLeave = () => {
    if (!cardRef.current || !glareRef.current) return
    gsap.to(cardRef.current, { 
      rotateX: 0, 
      rotateY: 0, 
      duration: 0.7, 
      ease: 'elastic.out(1, 0.4)' 
    })
    gsap.to(glareRef.current, { 
      opacity: 0, 
      duration: 0.35 
    })
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden rounded-[6px] bg-surface border border-hairline transform-gpu will-change-transform shadow-2",
        className
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Specular glare overlay */}
      <div
        ref={glareRef}
        className="pointer-events-none absolute -top-40 -left-40 w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.03)_50%,transparent_70%)] blur-xl opacity-0 -translate-x-1/2 -translate-y-1/2 will-change-transform"
      />
      <div className="relative z-10" style={{ transform: 'translateZ(18px)' }}>
        {children}
      </div>
    </div>
  )
}
