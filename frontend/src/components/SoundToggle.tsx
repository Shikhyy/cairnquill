import { useState } from 'react'
import { sound } from '@/lib/soundEngine'

export function SoundToggle() {
  const [muted, setMuted] = useState(sound.isMuted)

  const handleToggle = () => {
    const isNowMuted = sound.toggleMute()
    setMuted(isNowMuted)
  }

  return (
    <button
      onClick={handleToggle}
      className="h-8 px-2.5 rounded-md bg-surface-2/80 hover:bg-surface-3 border border-hairline hover:border-hairline-bold transition-all flex items-center gap-1.5 text-xs select-none"
      title={muted ? 'Unmute procedural audio' : 'Mute procedural audio'}
      aria-label={muted ? 'Unmute audio' : 'Mute audio'}
    >
      {muted ? (
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 text-ink-faint">
          <line x1="3" y1="5" x2="3" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="13" y1="6" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="14" x2="14" y2="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 text-accent">
          <line x1="3" y1="6" x2="3" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="13" y1="5" x2="13" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <span className="font-mono text-[11px] text-ink-2 font-medium">
        {muted ? 'Mute' : 'Audio'}
      </span>
    </button>
  )
}
