import { useState } from 'react'
import { sound } from '@/lib/soundEngine'
import { Volume2, VolumeX } from 'lucide-react'

export function SoundToggle() {
  const [muted, setMuted] = useState(sound.isMuted)

  const handleToggle = () => {
    const isNowMuted = sound.toggleMute()
    setMuted(isNowMuted)
  }

  return (
    <button
      onClick={handleToggle}
      data-magnetic="0.4"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-hairline/60 bg-surface-2/60 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
      title={muted ? 'Unmute procedural audio' : 'Mute procedural audio'}
      aria-label={muted ? 'Unmute audio' : 'Mute audio'}
    >
      {muted ? (
        <>
          <VolumeX size={13} className="text-zinc-500" />
          <span className="hidden sm:inline text-[11px]">Audio Off</span>
        </>
      ) : (
        <>
          <Volume2 size={13} className="text-cyan-400" />
          <div className="flex items-end gap-0.5 h-3">
            <span className="w-0.5 bg-cyan-400 rounded-full animate-pulse h-2" />
            <span className="w-0.5 bg-cyan-400 rounded-full animate-pulse h-3" style={{ animationDelay: '0.15s' }} />
            <span className="w-0.5 bg-cyan-400 rounded-full animate-pulse h-1.5" style={{ animationDelay: '0.3s' }} />
          </div>
          <span className="hidden sm:inline text-[11px] text-zinc-300">Live FX</span>
        </>
      )}
    </button>
  )
}
