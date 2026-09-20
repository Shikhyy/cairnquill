import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export function CairnStack({ count, activeIndex = -1 }: { count: number, activeIndex?: number }) {
  // Generate slightly random dimensions for each stone
  const stones = Array.from({ length: count }).map((_, i) => {
    // Top stones are smaller
    const scale = 1 - (i * 0.1)
    const width = Math.max(40, 100 * scale)
    const height = Math.max(12, 24 * scale)
    // Offset for organic look
    const offsetX = (i % 2 === 0 ? 1 : -1) * (i * 2)
    return { id: i, width, height, offsetX }
  }).reverse() // Render bottom to top in DOM

  return (
    <div className="flex flex-col items-center justify-end h-32 w-32 relative">
      {stones.map((s, idx) => {
        const isActive = activeIndex === s.id
        // Using framer-motion for the drop and wobble
        return (
          <motion.div
            key={s.id}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              delay: idx * 0.35 // 350ms per stone as per specs
            }}
            className={cn(
              "rounded-pill border border-ink/10 transition-colors",
              isActive ? "bg-accent/80 shadow-accent/20 border-accent" : "bg-ink-2/30",
              "cairn-stone-wobble"
            )}
            style={{
              width: s.width,
              height: s.height,
              transform: `translateX(${s.offsetX}px)`,
              marginBottom: -4, // stack overlap
              zIndex: stones.length - idx
            }}
          />
        )
      })}
    </div>
  )
}
