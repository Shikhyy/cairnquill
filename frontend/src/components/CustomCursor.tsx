import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { sound } from '@/lib/soundEngine'

/**
 * Awwwards Custom Magnetic Cursor System
 * - Lerped smooth follower with mix-blend-mode difference
 * - Magnetic pull on elements carrying data-magnetic
 * - Audio feedback on magnetic contact
 * - Hidden on touch / coarse pointer devices
 */

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const followerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return

    const cursor = cursorRef.current
    const follower = followerRef.current
    if (!cursor || !follower) return

    const mouse = { x: -100, y: -100 }
    const pos = { x: -100, y: -100 }
    const speed = 0.16 // Smooth lerp coefficient

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      gsap.set(cursor, { x: mouse.x, y: mouse.y })
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })

    // RAF loop using GSAP ticker for precision 60/120 FPS
    const ticker = gsap.ticker.add(() => {
      pos.x += (mouse.x - pos.x) * speed
      pos.y += (mouse.y - pos.y) * speed
      gsap.set(follower, { x: pos.x, y: pos.y })
    })

    // Setup magnetic interaction handlers
    const setupMagnetics = () => {
      const magnetics = document.querySelectorAll<HTMLElement>('[data-magnetic]')
      const cleanups: (() => void)[] = []

      magnetics.forEach((el) => {
        const onEnter = () => {
          sound.playClick(720, 0.02)
          gsap.to(follower, { 
            scale: 2.2, 
            opacity: 0.8,
            duration: 0.25, 
            ease: 'power2.out' 
          })
        }

        const onLeave = () => {
          gsap.to(follower, { 
            scale: 1, 
            opacity: 0.5,
            duration: 0.25, 
            ease: 'power2.out' 
          })
          gsap.to(el, { 
            x: 0, 
            y: 0, 
            ease: 'elastic.out(1, 0.35)', 
            duration: 0.7 
          })
        }

        const onMove = (e: MouseEvent) => {
          const rect = el.getBoundingClientRect()
          const strength = Number(el.dataset.magnetic) || 0.35
          const x = (e.clientX - rect.left - rect.width / 2) * strength
          const y = (e.clientY - rect.top - rect.height / 2) * strength
          gsap.to(el, { x, y, duration: 0.2, ease: 'power2.out' })
        }

        el.addEventListener('mouseenter', onEnter)
        el.addEventListener('mouseleave', onLeave)
        el.addEventListener('mousemove', onMove)

        cleanups.push(() => {
          el.removeEventListener('mouseenter', onEnter)
          el.removeEventListener('mouseleave', onLeave)
          el.removeEventListener('mousemove', onMove)
        })
      })

      return () => cleanups.forEach((c) => c())
    }

    const cleanupMagnetics = setupMagnetics()

    // Re-bind magnetics if DOM updates
    const observer = new MutationObserver(() => {
      cleanupMagnetics()
      setupMagnetics()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      gsap.ticker.remove(ticker)
      cleanupMagnetics()
      observer.disconnect()
    }
  }, [])

  return (
    <>
      {/* Precision Lead Dot */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-white rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 mix-blend-difference hidden md:block"
      />
      {/* Smooth Lerped Follower Ring */}
      <div
        ref={followerRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-white/60 pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 mix-blend-difference hidden md:block opacity-50 transition-opacity"
      />
    </>
  )
}
