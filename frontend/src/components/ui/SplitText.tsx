import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface SplitTextProps {
  children: string
  className?: string
  delay?: number
  duration?: number
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div'
}

/**
 * Awwwards Split-Text Line Masking Component
 * Wraps words into overflow-hidden masks and translates them up from yPercent: 100 -> 0.
 * Never animates raw text blocks directly.
 */

export function SplitText({
  children,
  className = '',
  delay = 0,
  duration = 0.85,
  as: Tag = 'h1',
}: SplitTextProps) {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const words = el.querySelectorAll('.word-inner')

    gsap.fromTo(
      words,
      { yPercent: 105, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration,
        delay,
        stagger: 0.04,
        ease: 'power3.out',
      }
    )
  }, [children, delay, duration])

  // Split string into word tokens
  const words = children.split(' ')

  return (
    <Tag ref={containerRef as any} className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-top mr-[0.25em] last:mr-0">
          <span className="word-inner inline-block will-change-transform">
            {word}
          </span>
        </span>
      ))}
    </Tag>
  )
}
